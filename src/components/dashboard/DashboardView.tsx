import React, { useMemo } from 'react';
import { 
  Users, 
  UserCheck, 
  Calendar, 
  MapPin, 
  Clock, 
  Cake, 
  ArrowRight, 
  ShieldCheck, 
  GitBranch, 
  BookOpen, 
  HeartHandshake,
  Sparkles,
  ChevronRight
} from 'lucide-react';
import { FamilyMember, FamilyEvent, UserProfile } from '../../types';
import { isMale, isFemale, getGenderDisplay, getGenderCode } from '../../utils/genderUtils';

interface DashboardViewProps {
  user: UserProfile;
  members: FamilyMember[];
  events: FamilyEvent[];
  onNavigateTab: (tab: string) => void;
  onSelectMember: (m: FamilyMember) => void;
  onSeedInitialData?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  user,
  members,
  events,
  onNavigateTab,
  onSelectMember,
  onSeedInitialData,
}) => {
  // Statistics computed from Firestore members
  const stats = useMemo(() => {
    const total = members.length;
    const male = members.filter((m) => isMale(m.gender)).length;
    const female = members.filter((m) => isFemale(m.gender)).length;
    const deceased = members.filter((m) => !!m.deathDate).length;
    const living = total - deceased;

    return { total, male, female, deceased, living };
  }, [members]);

  // Upcoming Events
  const upcomingEvents = useMemo(() => {
    return [...events]
      .sort((a, b) => new Date(a.tanggal).getTime() - new Date(b.tanggal).getTime())
      .slice(0, 3);
  }, [events]);

  // Recently Added Members
  const recentMembers = useMemo(() => {
    return [...members]
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
      .slice(0, 4);
  }, [members]);

  // Upcoming Birthdays (members whose birth month & day are approaching)
  const upcomingBirthdays = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth() + 1; // 1-12
    const currentDay = now.getDate();

    return members
      .filter((m) => !m.deathDate && m.birthDate)
      .map((m) => {
        const parts = m.birthDate!.split('-');
        if (parts.length < 3) return null;
        const bMonth = parseInt(parts[1], 10);
        const bDay = parseInt(parts[2], 10);
        let diff = (bMonth - currentMonth) * 31 + (bDay - currentDay);
        if (diff < 0) diff += 365; // next year
        return { member: m, diff, bMonth, bDay };
      })
      .filter((x): x is { member: FamilyMember; diff: number; bMonth: number; bDay: number } => x !== null)
      .sort((a, b) => a.diff - b.diff)
      .slice(0, 4);
  }, [members]);

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Hero Welcome Banner */}
      <section className="bg-white rounded-2xl border border-stone-200/90 shadow-xs overflow-hidden">
        <div className="p-6 sm:p-8 bg-linear-to-br from-emerald-950 via-emerald-900 to-stone-900 text-stone-100 relative">
          <div className="relative z-10 max-w-3xl">
            <div className="inline-flex items-center gap-2 text-amber-400 text-xs sm:text-sm font-semibold tracking-wider uppercase mb-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Portal Resmi Silaturahmi</span>
              <span className="text-emerald-500">·</span>
              <span className="text-amber-200">Peran: {user.role.toUpperCase()}</span>
            </div>

            <h1 className="text-2xl sm:text-3xl md:text-4xl font-serif-heritage font-bold text-white tracking-wide leading-tight">
              BANI NALI — Family Heritage & Genealogy
            </h1>

            <p className="mt-3 text-xs sm:text-sm md:text-base text-stone-300 leading-relaxed max-w-2xl">
              Selamat datang, <strong className="text-white font-medium">{user.displayName || user.email}</strong>. 
              Dokumentasi terpadu silsilah keluarga besar Bani Nali untuk mengenal leluhur, 
              merawat garis keturunan, serta mempererat silaturahmi antargenerasi.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                onClick={() => onNavigateTab('tree')}
                className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-semibold text-xs sm:text-sm rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
              >
                <GitBranch className="w-4 h-4" />
                <span>Buka Pohon Silsilah</span>
              </button>

              <button
                onClick={() => onNavigateTab('relationship')}
                className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-semibold text-xs sm:text-sm rounded-xl border border-white/20 transition-colors flex items-center gap-2 cursor-pointer"
              >
                <HeartHandshake className="w-4 h-4 text-amber-400" />
                <span>Kalkulator Kekerabatan</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Empty State Helper when Firestore is Empty */}
      {members.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-amber-950 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-sm text-amber-900">
              Database Silsilah Masih Kosong
            </h3>
            <p className="text-xs text-amber-800 mt-1 max-w-xl">
              Belum ada data anggota keluarga di Cloud Firestore. 
              Sebagai Admin, Anda dapat memuat data awal silsilah 4 generasi Bani Nali hanya dengan satu klik.
            </p>
          </div>
          {onSeedInitialData && user.role === 'admin' && (
            <button
              onClick={onSeedInitialData}
              className="px-4 py-2 bg-amber-800 hover:bg-amber-900 text-white rounded-xl text-xs font-semibold shrink-0 cursor-pointer"
            >
              Muat Data Silsilah Bani Nali
            </button>
          )}
        </div>
      )}

      {/* Real Statistics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        {/* Total Members */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200/90 shadow-xs">
          <div className="flex items-center justify-between text-stone-500">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Total Anggota</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-800 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-bold text-stone-900 font-serif-heritage">
              {stats.total}
            </span>
            <span className="text-xs text-stone-500 ml-1">Jiwa</span>
          </div>
          <p className="text-[11px] text-stone-400 mt-1">Terdata di Firestore</p>
        </div>

        {/* Male Members */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200/90 shadow-xs">
          <div className="flex items-center justify-between text-stone-500">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Laki-laki</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-800 flex items-center justify-center font-bold text-xs">
              L
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-bold text-stone-900 font-serif-heritage">
              {stats.male}
            </span>
            <span className="text-xs text-stone-500 ml-1">
              ({stats.total > 0 ? Math.round((stats.male / stats.total) * 100) : 0}%)
            </span>
          </div>
          <p className="text-[11px] text-stone-400 mt-1">Keturunan & Kerabat</p>
        </div>

        {/* Female Members */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200/90 shadow-xs">
          <div className="flex items-center justify-between text-stone-500">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Perempuan</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-800 flex items-center justify-center font-bold text-xs">
              P
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-bold text-stone-900 font-serif-heritage">
              {stats.female}
            </span>
            <span className="text-xs text-stone-500 ml-1">
              ({stats.total > 0 ? Math.round((stats.female / stats.total) * 100) : 0}%)
            </span>
          </div>
          <p className="text-[11px] text-stone-400 mt-1">Keturunan & Kerabat</p>
        </div>

        {/* Deceased Members */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200/90 shadow-xs">
          <div className="flex items-center justify-between text-stone-500">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Telah Wafat</span>
            <div className="w-8 h-8 rounded-lg bg-stone-100 text-stone-700 flex items-center justify-center text-xs">
              †
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-bold text-stone-900 font-serif-heritage">
              {stats.deceased}
            </span>
            <span className="text-xs text-stone-500 ml-1">Leluhur</span>
          </div>
          <p className="text-[11px] text-stone-400 mt-1">Semoga diampuni & dirahmati</p>
        </div>

        {/* Upcoming Events Count */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200/90 shadow-xs col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-stone-500">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Acara Keluarga</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-800 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-bold text-stone-900 font-serif-heritage">
              {events.length}
            </span>
            <span className="text-xs text-stone-500 ml-1">Agenda</span>
          </div>
          <p className="text-[11px] text-stone-400 mt-1">Pertemuan silaturahmi</p>
        </div>
      </div>

      {/* Visual Gender Distribution Bar */}
      {stats.total > 0 && (
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-stone-200/90 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs text-stone-600">
            <span className="font-semibold text-stone-800">Distribusi Gender Anggota Keluarga</span>
            <span>
              {stats.male} Laki-laki · {stats.female} Perempuan
            </span>
          </div>
          <div className="w-full h-3 rounded-full bg-stone-100 overflow-hidden flex">
            <div
              style={{ width: `${(stats.male / stats.total) * 100}%` }}
              className="bg-emerald-800 h-full transition-all"
              title={`Laki-laki: ${stats.male}`}
            />
            <div
              style={{ width: `${(stats.female / stats.total) * 100}%` }}
              className="bg-amber-600 h-full transition-all"
              title={`Perempuan: ${stats.female}`}
            />
          </div>
        </div>
      )}

      {/* Grid: Events, Recent Members, Upcoming Birthdays */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Kolom 1: Acara Mendatang */}
        <div className="bg-white p-6 rounded-2xl border border-stone-200/90 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-stone-100 mb-4">
              <div className="flex items-center gap-2 text-stone-900 font-bold text-sm">
                <Calendar className="w-4 h-4 text-emerald-800" />
                <span>Acara Mendatang</span>
              </div>
              <button
                onClick={() => onNavigateTab('events')}
                className="text-xs text-emerald-800 font-semibold hover:underline cursor-pointer"
              >
                Lihat Semua &rarr;
              </button>
            </div>

            {upcomingEvents.length === 0 ? (
              <p className="text-xs text-stone-400 italic py-4">Belum ada agenda terdekat</p>
            ) : (
              <div className="space-y-3">
                {upcomingEvents.map((ev) => (
                  <div key={ev.id} className="p-3 rounded-xl bg-stone-50 border border-stone-200/80">
                    <div className="flex items-center gap-1.5 text-[11px] text-amber-800 font-semibold">
                      <Clock className="w-3 h-3" />
                      <span>{ev.tanggal}</span>
                    </div>
                    <h4 className="text-xs sm:text-sm font-semibold text-stone-900 mt-1">
                      {ev.namaAcara}
                    </h4>
                    <p className="text-[11px] text-stone-500 mt-0.5 flex items-center gap-1 truncate">
                      <MapPin className="w-3 h-3 text-stone-400 shrink-0" />
                      <span>{ev.tempat}</span>
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Kolom 2: Anggota Terbaru */}
        <div className="bg-white p-6 rounded-2xl border border-stone-200/90 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-stone-100 mb-4">
              <div className="flex items-center gap-2 text-stone-900 font-bold text-sm">
                <Users className="w-4 h-4 text-emerald-800" />
                <span>Anggota Terbaru</span>
              </div>
              <button
                onClick={() => onNavigateTab('directory')}
                className="text-xs text-emerald-800 font-semibold hover:underline cursor-pointer"
              >
                Semua ({members.length}) &rarr;
              </button>
            </div>

            {recentMembers.length === 0 ? (
              <p className="text-xs text-stone-400 italic py-4">Belum ada data anggota</p>
            ) : (
              <div className="space-y-2.5">
                {recentMembers.map((m) => (
                  <div
                    key={m.id}
                    onClick={() => onSelectMember(m)}
                    className="p-2.5 rounded-xl bg-stone-50 hover:bg-stone-100 border border-stone-200/80 flex items-center justify-between gap-3 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-[10px] shrink-0 ${
                          isMale(m.gender)
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {m.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-semibold text-stone-900 truncate">
                          {m.name}
                        </h4>
                        <span className="text-[10px] text-stone-500 font-medium">
                          {getGenderDisplay(m.gender)} {m.birthPlace ? `· ${m.birthPlace}` : ''}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-stone-400" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Kolom 3: Ulang Tahun Terdekat */}
        <div className="bg-white p-6 rounded-2xl border border-stone-200/90 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-stone-100 mb-4">
              <div className="flex items-center gap-2 text-stone-900 font-bold text-sm">
                <Cake className="w-4 h-4 text-amber-600" />
                <span>Ulang Tahun Terdekat</span>
              </div>
              <span className="text-[11px] text-stone-400">Kerabat Hidup</span>
            </div>

            {upcomingBirthdays.length === 0 ? (
              <p className="text-xs text-stone-400 italic py-4">Data tanggal lahir belum tercatat</p>
            ) : (
              <div className="space-y-2.5">
                {upcomingBirthdays.map(({ member, bDay, bMonth }) => (
                  <div
                    key={member.id}
                    onClick={() => onSelectMember(member)}
                    className="p-2.5 rounded-xl bg-stone-50 hover:bg-stone-100 border border-stone-200/80 flex items-center justify-between gap-2 transition-colors cursor-pointer"
                  >
                    <div className="min-w-0">
                      <h4 className="text-xs font-semibold text-stone-900 truncate">
                        {member.name}
                      </h4>
                      <span className="text-[10px] text-amber-800 font-medium">
                        Tgl {bDay}/{bMonth} ({member.birthDate?.split('-')[0]})
                      </span>
                    </div>
                    <div className="px-2 py-1 bg-amber-100/70 text-amber-900 rounded-lg text-[10px] font-semibold">
                      Ucapan
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
