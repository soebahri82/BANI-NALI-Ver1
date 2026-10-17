import React from 'react';
import { 
  X, 
  MapPin, 
  Phone, 
  Calendar, 
  Heart, 
  Users, 
  Shield, 
  Edit3, 
  ExternalLink,
  Lock
} from 'lucide-react';
import { FamilyMember } from '../../types';
import { 
  getMemberSpouses, 
  getChildrenOfMember, 
  sortMembersByBirthDate 
} from '../../utils/familyTreeUtils';
import { 
  isMale, 
  isFemale, 
  getGenderCode, 
  getGenderDisplay 
} from '../../utils/genderUtils';

interface MemberProfileModalProps {
  member: FamilyMember | null;
  allMembers: FamilyMember[];
  isAdmin: boolean;
  onClose: () => void;
  onSelectMember: (m: FamilyMember) => void;
  onOpenTreeWithMember?: (m: FamilyMember) => void;
  onEditMember?: (m: FamilyMember) => void;
}

export const MemberProfileModal: React.FC<MemberProfileModalProps> = ({
  member,
  allMembers,
  isAdmin,
  onClose,
  onSelectMember,
  onOpenTreeWithMember,
  onEditMember,
}) => {
  if (!member) return null;

  const memberMap = new Map<string, FamilyMember>();
  allMembers.forEach((m) => memberMap.set(m.id, m));

  // Spouses (1 atau Lebih Pasangan yang diurutkan secara kronologis)
  const spouses = getMemberSpouses(member, allMembers);

  // Parents
  const parent = member.parentID ? memberMap.get(member.parentID) : null;

  // Children (Diurutkan secara ketat menurut tanggal lahir)
  const children = getChildrenOfMember(member, allMembers);

  // Siblings (Diurutkan menurut tanggal lahir)
  const rawSiblings = member.parentID
    ? allMembers.filter((m) => m.parentID === member.parentID && m.id !== member.id)
    : [];
  const siblings = sortMembersByBirthDate(rawSiblings, true);

  const male = isMale(member.gender);
  const isDeceased = !!member.deathDate;
  const isPrivate = member.privacy === 'private';
  const canViewSensitive = isAdmin || !isPrivate;

  // Calculate age
  const calculateAge = () => {
    if (!member.birthDate) return null;
    const bDate = new Date(member.birthDate);
    const endDate = member.deathDate ? new Date(member.deathDate) : new Date();
    let age = endDate.getFullYear() - bDate.getFullYear();
    const m = endDate.getMonth() - bDate.getMonth();
    if (m < 0 || (m === 0 && endDate.getDate() < bDate.getDate())) {
      age--;
    }
    return age;
  };

  const age = calculateAge();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs overflow-y-auto">
      <div 
        className="bg-white rounded-2xl shadow-xl border border-stone-200 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Cover Bar */}
        <div className="h-28 bg-linear-to-r from-emerald-900 via-emerald-800 to-stone-900 relative p-4 flex justify-between items-start">
          <div className="flex items-center gap-2 text-emerald-200 text-xs font-serif-heritage tracking-wider">
            <span>BANI NALI</span>
            <span>·</span>
            <span className="text-amber-400">Arsip Profil Keluarga</span>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-black/30 hover:bg-black/50 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content with Overlapping Avatar */}
        <div className="px-6 pb-6 pt-0 relative">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-12 mb-4">
            <div className="flex items-end gap-4">
              {member.photoURL ? (
                <img
                  src={member.photoURL}
                  alt={member.name}
                  className="w-24 h-24 rounded-2xl object-cover border-4 border-white shadow-md bg-stone-100"
                />
              ) : (
                <div
                  className={`w-24 h-24 rounded-2xl border-4 border-white shadow-md flex items-center justify-center font-bold text-xl ${
                    male
                      ? 'bg-emerald-100 text-emerald-900'
                      : 'bg-amber-100 text-amber-900'
                  }`}
                >
                  {member.name.slice(0, 2).toUpperCase()}
                </div>
              )}

              <div>
                <h3 className="text-xl sm:text-2xl font-bold font-serif-heritage text-stone-900 leading-tight">
                  {member.name}
                </h3>
                <div className="flex items-center gap-2 text-xs text-stone-500 mt-1">
                  <span className={`font-semibold ${male ? 'text-emerald-800' : 'text-amber-800'}`}>
                    {getGenderDisplay(member.gender)}
                  </span>
                  <span>·</span>
                  <span>ID: {member.id}</span>
                  {isDeceased && (
                    <>
                      <span>·</span>
                      <span className="text-stone-700 bg-stone-100 px-2 py-0.5 rounded text-[11px] font-medium border border-stone-200">
                        Almarhum / Almarhumah
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2 self-start sm:self-end">
              {onOpenTreeWithMember && (
                <button
                  onClick={() => {
                    onOpenTreeWithMember(member);
                    onClose();
                  }}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Lihat di Pohon</span>
                </button>
              )}

              {isAdmin && onEditMember && (
                <button
                  onClick={() => {
                    onEditMember(member);
                    onClose();
                  }}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg bg-stone-900 hover:bg-stone-800 text-white flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Ubah Data</span>
                </button>
              )}
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-4 p-4 rounded-xl bg-stone-50 border border-stone-200/80 text-xs">
            <div className="space-y-2">
              <div className="flex items-start gap-2 text-stone-700">
                <Calendar className="w-4 h-4 text-emerald-800 shrink-0 mt-0.5" />
                <div>
                  <span className="text-stone-400 block text-[10px]">Kelahiran & Usia</span>
                  <span className="font-medium text-stone-800">
                    {member.birthDate || 'Belum dicatat'}
                    {member.birthPlace ? ` (${member.birthPlace})` : ''}
                  </span>
                  {age !== null && (
                    <span className="text-stone-500 block text-[11px]">
                      {isDeceased ? `Wafat pada usia ${age} tahun` : `Usia saat ini: ${age} tahun`}
                    </span>
                  )}
                </div>
              </div>

              {isDeceased && (
                <div className="flex items-start gap-2 text-stone-700">
                  <Calendar className="w-4 h-4 text-stone-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-stone-400 block text-[10px]">Tanggal Wafat</span>
                    <span className="font-medium text-stone-800">{member.deathDate}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-start gap-2 text-stone-700">
                <MapPin className="w-4 h-4 text-emerald-800 shrink-0 mt-0.5" />
                <div>
                  <span className="text-stone-400 block text-[10px]">Domisili / Alamat</span>
                  {canViewSensitive ? (
                    <span className="font-medium text-stone-800">
                      {member.address || 'Belum dicatat'}
                    </span>
                  ) : (
                    <span className="text-stone-400 italic flex items-center gap-1">
                      <Lock className="w-3 h-3 text-stone-400" />
                      Disamarkan oleh privasi anggota
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-2 text-stone-700">
                <Phone className="w-4 h-4 text-emerald-800 shrink-0 mt-0.5" />
                <div>
                  <span className="text-stone-400 block text-[10px]">Kontak / Telepon</span>
                  {canViewSensitive ? (
                    <span className="font-medium text-stone-800">
                      {member.phone || 'Belum dicatat'}
                    </span>
                  ) : (
                    <span className="text-stone-400 italic flex items-center gap-1">
                      <Lock className="w-3 h-3 text-stone-400" />
                      Disamarkan oleh privasi anggota
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Biografi / Catatan */}
          {member.bio && (
            <div className="my-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-1.5">
                Riwayat & Catatan Kehidupan
              </h4>
              <p className="text-xs sm:text-sm text-stone-700 leading-relaxed bg-white p-3.5 rounded-xl border border-stone-200">
                {member.bio}
              </p>
            </div>
          )}

          {/* Relasi Silsilah Interaktif */}
          <div className="mt-5 space-y-4 pt-4 border-t border-stone-100">
            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500">
              Silsilah & Hubungan Keluarga
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {/* Pasangan (Mendukung 1 atau Lebih Pasangan) */}
              <div className="p-3.5 rounded-xl border border-stone-200 bg-stone-50/70">
                <div className="flex items-center justify-between text-stone-500 font-semibold mb-2">
                  <span className="flex items-center gap-1.5">
                    <Heart className="w-3.5 h-3.5 text-amber-600" />
                    <span>Daftar Pasangan ({spouses.length})</span>
                  </span>
                </div>

                {spouses.length > 0 ? (
                  <div className="space-y-2">
                    {spouses.map((s, idx) => {
                      const isWife = isFemale(s.gender);
                      const title = spouses.length > 1
                        ? `${isWife ? 'Istri' : 'Suami'} ke-${idx + 1}`
                        : (isWife ? 'Istri' : 'Suami');

                      return (
                        <button
                          key={s.id}
                          onClick={() => onSelectMember(s)}
                          className="w-full text-left p-2 rounded-lg bg-white border border-stone-200 hover:border-emerald-700 transition-colors flex items-center justify-between cursor-pointer group"
                        >
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-semibold text-amber-800 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                                {title}
                              </span>
                              {s.deathDate && (
                                <span className="text-[10px] text-stone-500 bg-stone-100 px-1 rounded">
                                  Almarhumah
                                </span>
                              )}
                            </div>
                            <div className="font-semibold text-stone-900 group-hover:text-emerald-800 text-xs mt-0.5">
                              {s.name}
                            </div>
                            <div className="text-[10px] text-stone-400">
                              {s.birthDate ? `Lahir: ${s.birthDate.split('-')[0]}` : ''}
                              {s.deathDate ? ` · Wafat: ${s.deathDate.split('-')[0]}` : ''}
                            </div>
                          </div>
                          <span className="text-[10px] text-emerald-800 font-medium group-hover:underline">
                            Profil &rarr;
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <span className="text-stone-400 italic">Belum terdata pasangan</span>
                )}
              </div>

              {/* Orang Tua */}
              <div className="p-3.5 rounded-xl border border-stone-200 bg-stone-50/70">
                <div className="flex items-center gap-1.5 text-stone-500 font-semibold mb-2">
                  <Users className="w-3.5 h-3.5 text-emerald-800" />
                  <span>Orang Tua (Garis Trah)</span>
                </div>
                {parent ? (
                  <button
                    onClick={() => onSelectMember(parent)}
                    className="w-full text-left p-2.5 rounded-lg bg-white border border-stone-200 hover:border-emerald-700 transition-colors flex items-center justify-between cursor-pointer group"
                  >
                    <div>
                      <div className="font-semibold text-stone-900 group-hover:text-emerald-800 text-xs">
                        {parent.name}
                      </div>
                      <div className="text-[10px] text-stone-400">
                        {getGenderDisplay(parent.gender)} {parent.birthDate ? `· Thn ${parent.birthDate.split('-')[0]}` : ''}
                      </div>
                    </div>
                    <span className="text-[10px] text-emerald-800 font-medium group-hover:underline">
                      Profil &rarr;
                    </span>
                  </button>
                ) : (
                  <span className="text-stone-400 italic">Sesepuh Utama / Akar Leluhur</span>
                )}
              </div>
            </div>

            {/* Keturunan / Anak-anak (Urutan Menurut Tanggal Lahir) */}
            <div className="p-3.5 rounded-xl border border-stone-200 bg-stone-50/70">
              <div className="flex items-center justify-between text-stone-500 font-semibold mb-2 text-xs">
                <span className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-emerald-800" />
                  <span>Keturunan / Anak-anak ({children.length})</span>
                </span>
                <span className="text-[10px] text-stone-400 font-normal">
                  Urut Kronologis Tanggal Lahir
                </span>
              </div>
              {children.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {children.map((child, idx) => (
                    <button
                      key={child.id}
                      onClick={() => onSelectMember(child)}
                      className="p-2.5 bg-white rounded-lg border border-stone-200 text-left hover:border-emerald-700 transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                          #{idx + 1} Anak {idx === 0 ? 'Pertama' : idx === children.length - 1 ? 'Bungsu' : `ke-${idx + 1}`}
                        </span>
                        {child.deathDate && (
                          <span className="text-[10px] text-stone-500 bg-stone-100 px-1 rounded">
                            Alm.
                          </span>
                        )}
                      </div>
                      <div className="font-semibold text-stone-900 group-hover:text-emerald-800 text-xs truncate">
                        {child.name}
                      </div>
                      <div className="text-[10px] text-stone-500 flex items-center gap-1 mt-0.5">
                        <Calendar className="w-2.5 h-2.5 text-stone-400" />
                        <span>
                          {child.birthDate ? `Lahir: ${child.birthDate}` : 'Tgl lahir belum dicatat'}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <span className="text-xs text-stone-400 italic">Belum ada anak tercatat</span>
              )}
            </div>

            {/* Saudara Kandung (Urutan Menurut Tanggal Lahir) */}
            {siblings.length > 0 && (
              <div className="p-3.5 rounded-xl border border-stone-200 bg-stone-50/70">
                <div className="flex items-center justify-between text-stone-500 font-semibold mb-2 text-xs">
                  <span className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-stone-600" />
                    <span>Saudara Kandung ({siblings.length})</span>
                  </span>
                  <span className="text-[10px] text-stone-400 font-normal">
                    Urut Tanggal Lahir
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {siblings.map((sib, idx) => (
                    <button
                      key={sib.id}
                      onClick={() => onSelectMember(sib)}
                      className="p-2.5 bg-white rounded-lg border border-stone-200 text-left hover:border-emerald-700 transition-colors cursor-pointer group"
                    >
                      <div className="font-semibold text-stone-900 group-hover:text-emerald-800 text-xs truncate">
                        {sib.name}
                      </div>
                      <div className="text-[10px] text-stone-500 flex items-center gap-1 mt-0.5">
                        <span>{sib.gender}</span>
                        {sib.birthDate && (
                          <>
                            <span>·</span>
                            <span>Lahir {sib.birthDate}</span>
                          </>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
