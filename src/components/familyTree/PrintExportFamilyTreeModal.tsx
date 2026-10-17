import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
  X,
  Printer,
  Download,
  FileText,
  Image as ImageIcon,
  Sparkles,
  Check,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize2,
  Calendar,
  Heart,
  Users,
  ShieldCheck,
  Sliders,
  ChevronDown,
  Loader2,
  Info
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { FamilyMember } from '../../types';
import {
  getMemberSpouses,
  sortMembersByBirthDate,
  getChildParentSpouseInfo
} from '../../utils/familyTreeUtils';
import { isMale, isFemale, getGenderCode } from '../../utils/genderUtils';

interface PrintExportFamilyTreeModalProps {
  isOpen: boolean;
  onClose: () => void;
  members: FamilyMember[];
}

type PaperSize = 'a4' | 'a3' | 'a2' | 'fit';
type VintageTheme = 'gold-vintage' | 'royal-heritage' | 'antique-parchment';
type Resolution = '1x' | '2x' | '3x';

interface PosterNode {
  id: string;
  member: FamilyMember;
  spouses: FamilyMember[];
  children: PosterNode[];
  level: number;
}

export const PrintExportFamilyTreeModal: React.FC<PrintExportFamilyTreeModalProps> = ({
  isOpen,
  onClose,
  members,
}) => {
  // Export Settings
  const [paperSize, setPaperSize] = useState<PaperSize>('a3');
  const [vintageTheme, setVintageTheme] = useState<VintageTheme>('gold-vintage');
  const [resolution, setResolution] = useState<Resolution>('2x');
  const [includePhotos, setIncludePhotos] = useState<boolean>(true);
  const [includeDates, setIncludeDates] = useState<boolean>(true);
  const [includeSpouses, setIncludeSpouses] = useState<boolean>(true);
  const [includeOfficialSeal, setIncludeOfficialSeal] = useState<boolean>(true);
  const [includeLegend, setIncludeLegend] = useState<boolean>(true);

  // Status
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportProgressText, setExportProgressText] = useState<string>('');
  const [previewZoom, setPreviewZoom] = useState<number>(0.65);

  const posterContainerRef = useRef<HTMLDivElement>(null);
  const printContentRef = useRef<HTMLDivElement>(null);

  // Map for fast lookup
  const memberMap = useMemo(() => {
    const map = new Map<string, FamilyMember>();
    members.forEach((m) => map.set(m.id, m));
    return map;
  }, [members]);

  // Build recursive tree structure for poster
  const posterTree = useMemo<PosterNode[]>(() => {
    const processedSpouseSet = new Set<string>();
    const visitedSet = new Set<string>();

    const buildNode = (member: FamilyMember, level: number): PosterNode => {
      visitedSet.add(member.id);
      const spouses = includeSpouses ? getMemberSpouses(member, members) : [];
      spouses.forEach((s) => processedSpouseSet.add(s.id));

      const parentIdSet = new Set<string>([member.id, ...spouses.map((s) => s.id)]);

      // Direct children
      const rawChildren: FamilyMember[] = [];
      members.forEach((candidate) => {
        if (!candidate.parentID) return;
        const pIds = candidate.parentID.split(/[,;]+/).map((p) => p.trim());
        const isChild = pIds.some((id) => parentIdSet.has(id));
        if (isChild && !visitedSet.has(candidate.id)) {
          rawChildren.push(candidate);
        }
      });

      const sortedChildren = sortMembersByBirthDate(rawChildren, true);
      const childrenNodes: PosterNode[] = sortedChildren.map((child) =>
        buildNode(child, level + 1)
      );

      return {
        id: member.id,
        member,
        spouses,
        children: childrenNodes,
        level,
      };
    };

    // Filter descendants' spouses so they are not treated as roots
    const spouseOfDescendantSet = new Set<string>();
    members.forEach((m) => {
      const hasParentInTree = !!(m.parentID && memberMap.has(m.parentID));
      if (hasParentInTree) {
        const spouses = getMemberSpouses(m, members);
        spouses.forEach((s) => spouseOfDescendantSet.add(s.id));
      }
    });

    // Root candidates: members who have no parents in dataset and are not spouses of descendants
    const potentialRoots = members.filter((m) => {
      const hasParentInTree = !!(m.parentID && memberMap.has(m.parentID));
      if (hasParentInTree) return false;
      if (spouseOfDescendantSet.has(m.id)) return false;
      return true;
    });

    // Group pairs
    const pairedSpouseSet = new Set<string>();
    const sortedCandidates = [...potentialRoots].sort((a, b) => {
      const aChildCount = members.filter((m) => m.parentID?.includes(a.id)).length;
      const bChildCount = members.filter((m) => m.parentID?.includes(b.id)).length;
      if (aChildCount !== bChildCount) return bChildCount - aChildCount;
      if (a.gender === 'L' && b.gender !== 'L') return -1;
      if (b.gender === 'L' && a.gender !== 'L') return 1;
      return (a.birthDate || '').localeCompare(b.birthDate || '');
    });

    const finalRoots: FamilyMember[] = [];
    sortedCandidates.forEach((cand) => {
      if (pairedSpouseSet.has(cand.id)) return;
      finalRoots.push(cand);
      const spouses = getMemberSpouses(cand, members);
      spouses.forEach((s) => pairedSpouseSet.add(s.id));
    });

    const rootsToBuild =
      finalRoots.length > 0
        ? finalRoots
        : potentialRoots.length > 0
        ? potentialRoots
        : members.slice(0, 1);

    return rootsToBuild.map((root) => buildNode(root, 1));
  }, [members, memberMap, includeSpouses]);

  // Adjust preview zoom automatically when modal opens
  useEffect(() => {
    if (isOpen) {
      // Set reasonable initial zoom based on screen size
      if (window.innerWidth < 768) {
        setPreviewZoom(0.35);
      } else if (window.innerWidth < 1200) {
        setPreviewZoom(0.5);
      } else {
        setPreviewZoom(0.65);
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Format years text
  const getYearsDisplay = (member: FamilyMember) => {
    const bYear = member.birthDate ? member.birthDate.split('-')[0] : '';
    const dYear = member.deathDate ? member.deathDate.split('-')[0] : '';
    if (member.deathDate) {
      return `${bYear || '?'} – ${dYear} (Wafat)`;
    }
    return bYear ? `Lahir: ${bYear}` : '';
  };

  // Generate canvas from poster element
  const generatePosterCanvas = async (scaleMultiplier: number): Promise<HTMLCanvasElement | null> => {
    if (!printContentRef.current) return null;
    const targetElement = printContentRef.current;

    setExportProgressText('Mempersiapkan elemen silsilah dan gaya vintage...');

    // Save previous transform and reset for pristine capture
    const originalTransform = targetElement.style.transform;
    const originalTransformOrigin = targetElement.style.transformOrigin;
    targetElement.style.transform = 'none';
    targetElement.style.transformOrigin = 'top left';

    await new Promise((r) => setTimeout(r, 100));

    setExportProgressText('Merender grafis berbingkai resolusi tinggi...');
    try {
      const canvas = await html2canvas(targetElement, {
        scale: scaleMultiplier,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#FAF6EE',
        logging: false,
        imageTimeout: 15000,
        windowWidth: targetElement.scrollWidth + 100,
        windowHeight: targetElement.scrollHeight + 100,
      });

      // Restore original transform
      targetElement.style.transform = originalTransform;
      targetElement.style.transformOrigin = originalTransformOrigin;
      return canvas;
    } catch (err) {
      console.error('Failed generating canvas:', err);
      targetElement.style.transform = originalTransform;
      targetElement.style.transformOrigin = originalTransformOrigin;
      throw err;
    }
  };

  // Export to PNG
  const handleExportPNG = async () => {
    try {
      setIsExporting(true);
      const scaleNum = resolution === '3x' ? 3 : resolution === '2x' ? 2 : 1;
      const canvas = await generatePosterCanvas(scaleNum);
      if (!canvas) throw new Error('Kanvas tidak berhasil dibentuk');

      setExportProgressText('Mengunduh berkas gambar PNG...');
      const imageUri = canvas.toDataURL('image/png', 1.0);
      const downloadLink = document.createElement('a');
      downloadLink.href = imageUri;
      downloadLink.download = `Silsilah_Keluarga_Bani_Nali_Lamongan_${new Date().toISOString().slice(0, 10)}.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    } catch (error) {
      console.error('Export PNG failed:', error);
      alert('Gagal mengekspor gambar PNG. Silakan coba kembali dengan resolusi standar.');
    } finally {
      setIsExporting(false);
      setExportProgressText('');
    }
  };

  // Export to PDF
  const handleExportPDF = async () => {
    try {
      setIsExporting(true);
      const scaleNum = resolution === '3x' ? 2.5 : resolution === '2x' ? 2 : 1.5;
      const canvas = await generatePosterCanvas(scaleNum);
      if (!canvas) throw new Error('Kanvas tidak berhasil dibentuk');

      setExportProgressText('Menyusun tata letak PDF proporsional...');

      // PDF dimensions in mm (Landscape)
      let pdfWidth = 420; // A3 default width
      let pdfHeight = 297; // A3 default height
      let formatName = 'a3';

      if (paperSize === 'a4') {
        pdfWidth = 297;
        pdfHeight = 210;
        formatName = 'a4';
      } else if (paperSize === 'a2') {
        pdfWidth = 594;
        pdfHeight = 420;
        formatName = 'a2';
      } else if (paperSize === 'fit') {
        // Compute custom aspect ratio
        const aspect = canvas.width / canvas.height;
        pdfHeight = 350;
        pdfWidth = pdfHeight * aspect;
        formatName = [pdfWidth, pdfHeight] as unknown as string;
      }

      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: formatName,
      });

      const margin = 8; // 8mm margin
      const availWidth = pdfWidth - margin * 2;
      const availHeight = pdfHeight - margin * 2;

      const imgAspect = canvas.width / canvas.height;
      const pageAspect = availWidth / availHeight;

      let drawW = availWidth;
      let drawH = availHeight;
      let posX = margin;
      let posY = margin;

      if (imgAspect > pageAspect) {
        // Fit by width
        drawW = availWidth;
        drawH = availWidth / imgAspect;
        posY = margin + (availHeight - drawH) / 2;
      } else {
        // Fit by height
        drawH = availHeight;
        drawW = availHeight * imgAspect;
        posX = margin + (availWidth - drawW) / 2;
      }

      setExportProgressText('Menyimpan dokumen PDF...');
      const imgData = canvas.toDataURL('image/jpeg', 0.96);
      pdf.addImage(imgData, 'JPEG', posX, posY, drawW, drawH, undefined, 'FAST');
      pdf.save(`Silsilah_Keluarga_Bani_Nali_Lamongan_${paperSize.toUpperCase()}.pdf`);
    } catch (error) {
      console.error('Export PDF failed:', error);
      alert('Gagal mengekspor PDF. Silakan coba kembali.');
    } finally {
      setIsExporting(false);
      setExportProgressText('');
    }
  };

  // Direct Browser Print
  const handleDirectPrint = () => {
    window.print();
  };

  // Recursive renderer for poster tree nodes
  const renderPosterNodeBranch = (
    node: PosterNode,
    indexInSibling: number = 0,
    parentSpouseInfo?: { spouseLabel?: string }
  ) => {
    const { member, spouses, children, level } = node;
    const isMaleMember = isMale(member.gender);
    const hasSpouses = spouses.length > 0;
    const hasChildren = children.length > 0;

    return (
      <div key={node.id} className="flex flex-col items-center relative">
        {/* Node Card Unit (Member + Spouses) */}
        <div className="flex items-center justify-center gap-2 relative z-10">
          {/* If 2 spouses: Left spouse */}
          {hasSpouses && spouses.length >= 2 && (
            <div className="flex items-center gap-1">
              {renderPosterSingleCard(spouses[0], {
                isSpouse: true,
                spouseOrder: 1,
              })}
              {/* Gold Marriage Bridge #1 */}
              <div className="flex flex-col items-center justify-center px-0.5">
                <div className="w-4 h-0.5 bg-amber-700/70" />
                <div className="p-0.5 rounded-full bg-amber-100 border border-amber-400 text-amber-900 -my-1 text-[8px] font-bold">
                  <Heart className="w-2.5 h-2.5 fill-amber-600 text-amber-700" />
                </div>
              </div>
            </div>
          )}

          {/* Primary Member Card */}
          {renderPosterSingleCard(member, {
            isPrimary: true,
            level,
            childOrder: level > 1 ? indexInSibling + 1 : undefined,
            motherInfo: parentSpouseInfo?.spouseLabel,
          })}

          {/* If 1 or 2 spouses: Right spouse (or single spouse) */}
          {hasSpouses && (
            <div className="flex items-center gap-1">
              {/* Gold Marriage Bridge */}
              <div className="flex flex-col items-center justify-center px-0.5">
                <div className="w-4 h-0.5 bg-amber-700/70" />
                <div className="p-0.5 rounded-full bg-amber-100 border border-amber-400 text-amber-900 -my-1 text-[8px] font-bold">
                  <Heart className="w-2.5 h-2.5 fill-amber-600 text-amber-700" />
                </div>
              </div>

              {renderPosterSingleCard(spouses[spouses.length >= 2 ? 1 : 0], {
                isSpouse: true,
                spouseOrder: spouses.length >= 2 ? 2 : 1,
              })}
            </div>
          )}
        </div>

        {/* Children Connector Branches */}
        {hasChildren && (
          <div className="flex flex-col items-center mt-3 w-full">
            {/* Vertical stem drop from parent card */}
            <div className="w-0.5 h-6 bg-amber-900/80" />

            {/* Horizontal branch bar */}
            <div className="flex items-start justify-center gap-6 relative pt-4">
              {/* Top cross connector line */}
              {children.length > 1 && (
                <div
                  className="absolute top-0 h-0.5 bg-amber-900/80"
                  style={{
                    left: '40px',
                    right: '40px',
                  }}
                />
              )}

              {/* Children recursive list */}
              {children.map((childNode, cIdx) => {
                const childInfo = getChildParentSpouseInfo(childNode.member, member, spouses);
                return (
                  <div key={childNode.id} className="flex flex-col items-center relative">
                    {/* Vertical connector drop to child */}
                    <div className="w-0.5 h-4 bg-amber-900/80 absolute -top-4" />
                    {renderPosterNodeBranch(childNode, cIdx, {
                      spouseLabel: childInfo.spouseLabel,
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Render individual member card inside vintage poster
  const renderPosterSingleCard = (
    member: FamilyMember,
    options: {
      isPrimary?: boolean;
      isSpouse?: boolean;
      spouseOrder?: number;
      level?: number;
      childOrder?: number;
      motherInfo?: string;
    } = {}
  ) => {
    const male = isMale(member.gender);
    const isDeceased = !!member.deathDate;
    const genderCode = getGenderCode(member.gender);
    const isTrah = member.lineageStatus === 'trah' || options.isPrimary;

    return (
      <div
        key={member.id}
        className={`w-[195px] rounded-lg p-2.5 border transition-all text-center relative flex flex-col items-center select-none ${
          isTrah
            ? 'bg-[#FFFDF8] border-amber-900/40 shadow-xs'
            : 'bg-[#FAF6EC] border-stone-300 shadow-2xs'
        }`}
        style={{
          boxShadow: '0 1px 3px rgba(120, 53, 15, 0.08)',
        }}
      >
        {/* Top Accent Strip */}
        <div
          className={`h-1 w-16 absolute top-0 rounded-full ${
            options.isSpouse
              ? 'bg-amber-600'
              : male
              ? 'bg-emerald-800'
              : 'bg-rose-700'
          }`}
        />

        {/* Role or Child Order Badge */}
        {options.childOrder ? (
          <div className="text-[8.5px] font-bold text-amber-950 bg-amber-100/90 border border-amber-300/80 px-2 py-0.2 rounded-full mb-1">
            Anak ke-{options.childOrder}
            {options.motherInfo && ` · Ibu: ${options.motherInfo.split(' ')[0]}`}
          </div>
        ) : options.isSpouse ? (
          <div className="text-[8.5px] font-semibold text-stone-700 bg-stone-200/80 px-2 py-0.2 rounded-full mb-1">
            {isFemale(member.gender) ? 'Istri' : 'Suami'}
            {options.spouseOrder && options.spouseOrder > 1 ? ` ke-${options.spouseOrder}` : ''}
          </div>
        ) : options.level === 1 ? (
          <div className="text-[8.5px] font-bold text-amber-950 bg-amber-200/90 border border-amber-400 px-2.5 py-0.2 rounded-full mb-1">
            Pondasi Trah Bani Nali
          </div>
        ) : null}

        {/* Photo or Vintage Silhouette Avatar */}
        <div className="mt-0.5 mb-1.5 flex justify-center">
          {includePhotos && member.photoURL ? (
            <img
              src={member.photoURL}
              alt={member.name}
              crossOrigin="anonymous"
              className="w-10 h-10 rounded-full object-cover border-2 border-amber-700/50 shadow-2xs"
            />
          ) : (
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center font-serif font-bold text-xs border border-amber-800/40 ${
                male
                  ? 'bg-emerald-50 text-emerald-900 border-emerald-700/40'
                  : 'bg-amber-50 text-amber-950 border-amber-700/40'
              }`}
            >
              {member.name.charAt(0)}
            </div>
          )}
        </div>

        {/* Member Full Name */}
        <h4 className="text-[11px] font-bold font-serif text-stone-900 leading-tight line-clamp-2 px-1">
          {member.name}
        </h4>

        {/* Gender Badge & Status */}
        <div className="flex items-center justify-center gap-1.5 mt-1 text-[8.5px]">
          <span
            className={`font-semibold px-1.5 py-0.2 rounded text-[8px] ${
              male ? 'bg-emerald-100 text-emerald-900' : 'bg-rose-100 text-rose-900'
            }`}
          >
            {genderCode === 'L' ? 'Laki-laki' : 'Perempuan'}
          </span>
          {isDeceased && (
            <span className="text-stone-600 bg-stone-200/90 px-1 py-0.2 rounded text-[8px] font-medium">
              Alm.
            </span>
          )}
        </div>

        {/* Birth - Death Dates */}
        {includeDates && (
          <p className="text-[8px] text-stone-600 mt-1 font-mono tracking-tight">
            {getYearsDisplay(member) || member.birthPlace || 'Bani Nali'}
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-stone-950/80 backdrop-blur-xs overflow-hidden">
      {/* Print Stylesheet injection for direct window.print */}
      <style>
        {`
          @media print {
            body * {
              visibility: hidden !important;
            }
            #printable-vintage-poster, #printable-vintage-poster * {
              visibility: visible !important;
            }
            #printable-vintage-poster {
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: 100% !important;
              max-width: 100% !important;
              margin: 0 !important;
              padding: 10mm !important;
              box-shadow: none !important;
              border: 4px solid #78350f !important;
              background-color: #FAF6EE !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            @page {
              size: landscape;
              margin: 5mm;
            }
          }
        `}
      </style>

      {/* Main Modal Card */}
      <div className="bg-white w-full max-w-7xl h-[96vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-stone-200 animate-in fade-in zoom-in-95 duration-200">
        {/* Top Modal Header */}
        <div className="px-5 py-3.5 bg-stone-900 text-stone-100 flex items-center justify-between border-b border-stone-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-600/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold font-serif tracking-wide text-white flex items-center gap-2">
                <span>Cetak & Unduh Silsilah Keluarga (PDF & PNG)</span>
                <span className="text-[10px] bg-amber-500/20 text-amber-300 font-sans px-2 py-0.5 rounded-full border border-amber-500/30">
                  Full Silsilah Berbingkai Vintage
                </span>
              </h2>
              <p className="text-xs text-stone-400">
                Format poster silsilah lengkap dengan bingkai vintage dan judul resmi Bani Nali Lamongan.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-stone-400 hover:text-white hover:bg-stone-800 transition-colors cursor-pointer"
            title="Tutup Menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar & Options Bar */}
        <div className="p-3 bg-stone-50 border-b border-stone-200 flex flex-wrap items-center justify-between gap-3 shrink-0 text-xs">
          {/* Format Settings Controls */}
          <div className="flex items-center flex-wrap gap-2.5">
            {/* Paper Size */}
            <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-lg border border-stone-300 shadow-2xs">
              <span className="font-semibold text-stone-700">Kertas PDF:</span>
              <select
                value={paperSize}
                onChange={(e) => setPaperSize(e.target.value as PaperSize)}
                className="bg-transparent font-medium text-stone-900 focus:outline-none cursor-pointer"
              >
                <option value="a3">A3 Landscape (Rekomendasi Poster)</option>
                <option value="a4">A4 Landscape (Standar Dokumen)</option>
                <option value="a2">A2 Poster Besar (Pigura Dinding)</option>
                <option value="fit">Otomatis / Proporsional Penuh</option>
              </select>
            </div>

            {/* Vintage Frame Style */}
            <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-lg border border-stone-300 shadow-2xs">
              <span className="font-semibold text-stone-700">Bingkai Vintage:</span>
              <select
                value={vintageTheme}
                onChange={(e) => setVintageTheme(e.target.value as VintageTheme)}
                className="bg-transparent font-medium text-stone-900 focus:outline-none cursor-pointer"
              >
                <option value="gold-vintage">Vintage Emas Klasik Keraton</option>
                <option value="royal-heritage">Warisan Mulia (Sepia & Bronze)</option>
                <option value="antique-parchment">Perkamen Antik Tradisional</option>
              </select>
            </div>

            {/* Resolution */}
            <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-lg border border-stone-300 shadow-2xs">
              <span className="font-semibold text-stone-700">Resolusi:</span>
              <select
                value={resolution}
                onChange={(e) => setResolution(e.target.value as Resolution)}
                className="bg-transparent font-medium text-stone-900 focus:outline-none cursor-pointer"
              >
                <option value="2x">Tinggi (2x HD)</option>
                <option value="3x">Ultra HD (3x Tajam Maksimal)</option>
                <option value="1x">Standar (1x Cepat)</option>
              </select>
            </div>

            {/* Toggles */}
            <label className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-lg border border-stone-300 shadow-2xs cursor-pointer select-none">
              <input
                type="checkbox"
                checked={includeDates}
                onChange={(e) => setIncludeDates(e.target.checked)}
                className="rounded text-amber-700 focus:ring-amber-600"
              />
              <span className="text-stone-700">Tahun Lahir/Wafat</span>
            </label>

            <label className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-lg border border-stone-300 shadow-2xs cursor-pointer select-none">
              <input
                type="checkbox"
                checked={includeSpouses}
                onChange={(e) => setIncludeSpouses(e.target.checked)}
                className="rounded text-amber-700 focus:ring-amber-600"
              />
              <span className="text-stone-700">Pasangan & Mantu</span>
            </label>
          </div>

          {/* Export Action Buttons */}
          <div className="flex items-center gap-2">
            {/* Direct Print Button */}
            <button
              onClick={handleDirectPrint}
              disabled={isExporting}
              className="px-3 py-1.5 rounded-lg bg-stone-200 hover:bg-stone-300 text-stone-800 font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Cetak langsung menggunakan dialog printer browser"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Langsung</span>
            </button>

            {/* Download PNG Button */}
            <button
              onClick={handleExportPNG}
              disabled={isExporting}
              className="px-3.5 py-1.5 rounded-lg bg-amber-700 hover:bg-amber-800 text-white font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer disabled:opacity-60"
            >
              {isExporting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ImageIcon className="w-4 h-4" />
              )}
              <span>Unduh PNG</span>
            </button>

            {/* Download PDF Button */}
            <button
              onClick={handleExportPDF}
              disabled={isExporting}
              className="px-4 py-1.5 rounded-lg bg-emerald-900 hover:bg-emerald-950 text-white font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer disabled:opacity-60"
            >
              {isExporting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileText className="w-4 h-4" />
              )}
              <span>Unduh PDF</span>
            </button>
          </div>
        </div>

        {/* Loading Overlay */}
        {isExporting && (
          <div className="bg-amber-50/95 border-b border-amber-200 px-4 py-2 flex items-center justify-center gap-2.5 text-xs text-amber-900 font-medium">
            <Loader2 className="w-4 h-4 animate-spin text-amber-700" />
            <span>{exportProgressText || 'Sedang memproses poster silsilah keluarga...'}</span>
          </div>
        )}

        {/* Main Preview Work Area */}
        <div
          ref={posterContainerRef}
          className="flex-1 bg-stone-200/90 overflow-auto p-4 sm:p-8 flex flex-col items-center relative"
        >
          {/* Zoom controls for interactive preview */}
          <div className="sticky top-2 right-2 self-end z-30 bg-white/90 backdrop-blur-xs p-1.5 rounded-xl shadow-md border border-stone-300 flex items-center gap-1 text-xs">
            <button
              onClick={() => setPreviewZoom((z) => Math.max(0.2, z - 0.1))}
              className="p-1 rounded hover:bg-stone-100 text-stone-700"
              title="Perkecil Preview"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="font-semibold text-stone-700 px-1 w-12 text-center">
              {Math.round(previewZoom * 100)}%
            </span>
            <button
              onClick={() => setPreviewZoom((z) => Math.min(1.5, z + 0.1))}
              className="p-1 rounded hover:bg-stone-100 text-stone-700"
              title="Perbesar Preview"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPreviewZoom(0.65)}
              className="p-1 rounded hover:bg-stone-100 text-stone-700 ml-1"
              title="Reset Zoom"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          {/* THE VINTAGE POSTER (Target of HTML2Canvas, PDF and Print) */}
          <div
            id="printable-vintage-poster"
            ref={printContentRef}
            style={{
              transform: `scale(${previewZoom})`,
              transformOrigin: 'top center',
              transition: isExporting ? 'none' : 'transform 0.15s ease-out',
            }}
            className="bg-[#FAF6EE] text-stone-900 shadow-2xl relative transition-all my-2 select-none"
          >
            {/* VINTAGE OUTER FRAME (BINGKAI VINTAGE) */}
            <div
              className={`p-6 sm:p-10 relative ${
                vintageTheme === 'gold-vintage'
                  ? 'border-[10px] border-[#78350F]'
                  : vintageTheme === 'royal-heritage'
                  ? 'border-[12px] border-[#451A03]'
                  : 'border-[8px] border-[#854D0E]'
              }`}
              style={{
                boxShadow: 'inset 0 0 25px rgba(120, 53, 15, 0.15)',
                minWidth: '1150px',
              }}
            >
              {/* Inner Decorative Double Gold Border */}
              <div className="border-2 border-[#B45309] p-3 sm:p-5 relative">
                <div className="border border-[#D97706]/60 p-6 sm:p-8 relative bg-[#FAF6EE]">
                  {/* VINTAGE CORNER ORNAMENTS (4 SUDUT UKIRAN VINTAGE) */}
                  {/* Top Left Corner */}
                  <div className="absolute -top-3.5 -left-3.5 w-12 h-12 text-[#92400E] pointer-events-none select-none">
                    <svg viewBox="0 0 100 100" fill="currentColor" className="w-full h-full opacity-90">
                      <path d="M0,0 L40,0 C30,10 20,25 20,40 C10,30 5,15 0,0 Z M0,0 L0,40 C10,30 25,20 40,20 C30,10 15,5 0,0 Z" />
                      <circle cx="28" cy="28" r="8" fill="none" stroke="currentColor" strokeWidth="3" />
                      <circle cx="28" cy="28" r="3" />
                      <path d="M0,50 C25,45 45,25 50,0 C35,20 20,35 0,50 Z" />
                    </svg>
                  </div>

                  {/* Top Right Corner */}
                  <div className="absolute -top-3.5 -right-3.5 w-12 h-12 text-[#92400E] pointer-events-none select-none rotate-90">
                    <svg viewBox="0 0 100 100" fill="currentColor" className="w-full h-full opacity-90">
                      <path d="M0,0 L40,0 C30,10 20,25 20,40 C10,30 5,15 0,0 Z M0,0 L0,40 C10,30 25,20 40,20 C30,10 15,5 0,0 Z" />
                      <circle cx="28" cy="28" r="8" fill="none" stroke="currentColor" strokeWidth="3" />
                      <circle cx="28" cy="28" r="3" />
                      <path d="M0,50 C25,45 45,25 50,0 C35,20 20,35 0,50 Z" />
                    </svg>
                  </div>

                  {/* Bottom Left Corner */}
                  <div className="absolute -bottom-3.5 -left-3.5 w-12 h-12 text-[#92400E] pointer-events-none select-none -rotate-90">
                    <svg viewBox="0 0 100 100" fill="currentColor" className="w-full h-full opacity-90">
                      <path d="M0,0 L40,0 C30,10 20,25 20,40 C10,30 5,15 0,0 Z M0,0 L0,40 C10,30 25,20 40,20 C30,10 15,5 0,0 Z" />
                      <circle cx="28" cy="28" r="8" fill="none" stroke="currentColor" strokeWidth="3" />
                      <circle cx="28" cy="28" r="3" />
                      <path d="M0,50 C25,45 45,25 50,0 C35,20 20,35 0,50 Z" />
                    </svg>
                  </div>

                  {/* Bottom Right Corner */}
                  <div className="absolute -bottom-3.5 -right-3.5 w-12 h-12 text-[#92400E] pointer-events-none select-none rotate-180">
                    <svg viewBox="0 0 100 100" fill="currentColor" className="w-full h-full opacity-90">
                      <path d="M0,0 L40,0 C30,10 20,25 20,40 C10,30 5,15 0,0 Z M0,0 L0,40 C10,30 25,20 40,20 C30,10 15,5 0,0 Z" />
                      <circle cx="28" cy="28" r="8" fill="none" stroke="currentColor" strokeWidth="3" />
                      <circle cx="28" cy="28" r="3" />
                      <path d="M0,50 C25,45 45,25 50,0 C35,20 20,35 0,50 Z" />
                    </svg>
                  </div>

                  {/* HEADER DI DALAM BINGKAI: JUDUL YANG PROPORSIONAL */}
                  <div className="flex flex-col items-center justify-center text-center pb-8 border-b-2 border-amber-900/30 mb-8 relative">
                    {/* Top Decorative Filigree Crest / Fleur-de-lis */}
                    <div className="flex items-center gap-3 text-amber-800/80 mb-2">
                      <div className="w-16 h-0.5 bg-gradient-to-r from-transparent to-amber-800" />
                      <span className="text-xl">⚜</span>
                      <span className="text-xs tracking-widest uppercase font-serif font-semibold text-amber-900">
                        Nasab & Silaturahmi Trah Agung
                      </span>
                      <span className="text-xl">⚜</span>
                      <div className="w-16 h-0.5 bg-gradient-to-l from-transparent to-amber-800" />
                    </div>

                    {/* JUDUL RESMI YANG PROPORSIONAL SESUAI PERMINTAAN */}
                    <h1
                      className="text-2xl sm:text-3xl md:text-4xl font-black font-serif tracking-wider text-[#2B1704] uppercase relative"
                      style={{
                        letterSpacing: '0.08em',
                        textShadow: '1px 1px 2px rgba(120, 53, 15, 0.15)',
                      }}
                    >
                      SILSILAH KELUARGA BANI NALI LAMONGAN
                    </h1>

                    {/* Subjudul & Keterangan Asal Usul */}
                    <p className="text-xs sm:text-sm text-stone-700 font-serif italic mt-1.5 max-w-2xl">
                      Bagan Silsilah Kekerabatan, Garis Keturunan, dan Hubungan Perkawinan Keluarga Besar
                      Bani Nali — Lamongan, Jawa Timur
                    </p>

                    {/* Classical Ornate Divider Bar */}
                    <div className="flex items-center justify-center gap-2 mt-3 text-amber-800/60">
                      <div className="w-24 h-px bg-amber-800/40" />
                      <span className="text-xs">✦</span>
                      <div className="w-6 h-px bg-amber-800/40" />
                      <span className="text-xs font-serif font-bold text-amber-950 px-2">
                        Dokumen Nasab Resmi
                      </span>
                      <div className="w-6 h-px bg-amber-800/40" />
                      <span className="text-xs">✦</span>
                      <div className="w-24 h-px bg-amber-800/40" />
                    </div>
                  </div>

                  {/* FULL SILSILAH TREE WORKSPACE */}
                  <div className="w-full flex flex-col items-center justify-center py-4 px-2 min-h-[420px]">
                    {posterTree.length === 0 ? (
                      <div className="text-center p-8 text-stone-500">
                        Belum ada data anggota keluarga yang dapat ditampilkan dalam bagan silsilah.
                      </div>
                    ) : (
                      <div className="flex items-start justify-center gap-12 flex-wrap">
                        {posterTree.map((rootNode, rIdx) => (
                          <div key={rootNode.id} className="flex flex-col items-center">
                            {renderPosterNodeBranch(rootNode, rIdx)}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* VINTAGE FOOTER: LEGENDA & STEMPEL RESMI BANI NALI */}
                  <div className="mt-12 pt-6 border-t-2 border-amber-900/30 flex flex-wrap items-end justify-between gap-6 text-stone-700 text-xs">
                    {/* Left: Legenda Silsilah */}
                    {includeLegend && (
                      <div className="p-3 rounded-lg bg-[#FAF6EE] border border-amber-900/30 max-w-md">
                        <h5 className="font-serif font-bold text-stone-900 text-[11px] mb-1.5 flex items-center gap-1">
                          <span>✦</span>
                          <span>Keterangan & Legenda Bagan Silsilah:</span>
                        </h5>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[9px]">
                          <div className="flex items-center gap-1.5">
                            <span className="w-3 h-2 rounded-xs bg-[#FFFDF8] border border-amber-900/50" />
                            <span>Keturunan Langsung (Trah)</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="w-3 h-2 rounded-xs bg-[#FAF6EC] border border-stone-300" />
                            <span>Pasangan / Mantu</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Heart className="w-2.5 h-2.5 fill-amber-600 text-amber-700" />
                            <span>Ikatan Pernikahan Sah</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-700" />
                            <span>Laki-laki (L) / Perempuan (P)</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Center: Catatan Silaturahmi */}
                    <div className="text-center flex flex-col items-center max-w-xs">
                      <p className="text-[10px] font-serif italic text-stone-700">
                        "Menjaga dan merajut tali silaturahmi, memelihara marwah keluarga, dan meneruskan
                        amal jariyah leluhur."
                      </p>
                      <p className="text-[9px] font-mono text-stone-500 mt-1">
                        Dicetak pada: {new Date().toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </p>
                    </div>

                    {/* Right: Cap Segel Trah Bani Nali Resmi */}
                    {includeOfficialSeal && (
                      <div className="flex flex-col items-center">
                        <div className="w-20 h-20 rounded-full border-2 border-dashed border-amber-900/60 p-1 flex items-center justify-center relative">
                          <div className="w-full h-full rounded-full border border-amber-900/80 flex flex-col items-center justify-center text-center p-1 bg-amber-50/50">
                            <span className="text-[7.5px] font-serif font-black tracking-wider text-amber-950 uppercase">
                              CAP NASAB RESMI
                            </span>
                            <span className="text-[9px] font-serif font-black text-amber-900">
                              BANI NALI
                            </span>
                            <span className="text-[6.5px] tracking-tight text-amber-800 uppercase">
                              LAMONGAN
                            </span>
                            <span className="text-[8px] text-amber-700 mt-0.5">✦ ✦ ✦</span>
                          </div>
                        </div>
                        <span className="text-[8px] font-serif font-semibold text-stone-600 mt-1">
                          Otentikasi Arsip Silsilah
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Bottom Footer Info */}
        <div className="px-5 py-2.5 bg-stone-100 border-t border-stone-200 text-stone-500 text-xs flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-amber-700" />
            <span>
              Poster silsilah siap dicetak ke ukuran kertas besar (A3 / A2 Poster) untuk dibingkai pigura di rumah keluarga.
            </span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1 rounded-lg bg-stone-200 hover:bg-stone-300 text-stone-800 font-medium transition-colors cursor-pointer text-xs"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
