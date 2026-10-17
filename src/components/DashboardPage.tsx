import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { FamilyMember, FamilyEvent } from '../types';
import { subscribeMembers, seedInitialBaniNali, standardizeDatabaseRecords } from '../services/memberService';
import { subscribeEvents, seedInitialEvents } from '../services/eventService';
import { Header } from './layout/Header';
import { Sidebar } from './layout/Sidebar';
import { MobileNav } from './layout/MobileNav';
import { DashboardView } from './dashboard/DashboardView';
import { FamilyTreeViewer } from './familyTree/FamilyTreeViewer';
import { MemberDirectory } from './directory/MemberDirectory';
import { RelationshipCalculatorView } from './relationship/RelationshipCalculatorView';
import { EventsView } from './events/EventsView';
import { AdminPanel } from './admin/AdminPanel';
import { UserProfileView } from './profile/UserProfileView';
import { MemberProfileModal } from './profile/MemberProfileModal';
import { Maximize2, Printer } from 'lucide-react';
import { PrintExportFamilyTreeModal } from './familyTree/PrintExportFamilyTreeModal';

export const DashboardPage: React.FC = () => {
  const { userProfile, isAdmin, logout, refreshUserProfile } = useAuth();
  
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [isTreeExpanded, setIsTreeExpanded] = useState<boolean>(true);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [events, setEvents] = useState<FamilyEvent[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);

  // Modal Profile State
  const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(null);
  const [highlightedTreeMemberId, setHighlightedTreeMemberId] = useState<string | null>(null);

  // Mobile drawer state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Subscribe to Firestore collections & auto-standardize database if admin
  useEffect(() => {
    setLoadingData(true);
    let unsubMembers: (() => void) | undefined;
    let unsubEvents: (() => void) | undefined;

    try {
      unsubMembers = subscribeMembers(
        (data) => {
          setMembers(data);
          setLoadingData(false);
          // If admin, auto-check and standardize legacy records (L/P, family)
          if (isAdmin && data.length > 0) {
            standardizeDatabaseRecords().catch((e) => console.warn('Auto-standardize notice:', e));
          }
        },
        (err) => {
          console.error('Error fetching members:', err);
          setDataError(err.message);
          setLoadingData(false);
        }
      );

      unsubEvents = subscribeEvents(
        (data) => {
          setEvents(data);
        },
        (err) => {
          console.error('Error fetching events:', err);
        }
      );
    } catch (e: unknown) {
      setDataError(e instanceof Error ? e.message : 'Gagal terhubung ke Firestore.');
      setLoadingData(false);
    }

    return () => {
      if (unsubMembers) unsubMembers();
      if (unsubEvents) unsubEvents();
    };
  }, []);

  const handleSeedData = async () => {
    try {
      await seedInitialBaniNali();
      await seedInitialEvents();
    } catch (err) {
      console.error('Seed error:', err);
    }
  };

  const handleOpenTreeWithMember = (m: FamilyMember) => {
    setHighlightedTreeMemberId(m.id);
    setCurrentTab('tree');
  };

  if (!userProfile) return null;

  return (
    <div className="min-h-screen flex flex-col bg-stone-100 text-stone-900 pb-16 lg:pb-0">
      {/* Top Fixed Header */}
      <Header
        user={userProfile}
        members={members}
        onLogout={logout}
        onSelectMember={(m) => setSelectedMember(m)}
        onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
        onOpenProfile={() => setCurrentTab('profile')}
      />

      {/* Main Body with Sidebar + Tab Content */}
      <div
        className={`flex-1 w-full mx-auto py-5 sm:py-7 flex gap-6 sm:gap-8 transition-all ${
          currentTab === 'tree'
            ? isTreeExpanded
              ? 'max-w-full px-2 sm:px-4'
              : 'max-w-[1750px] px-3 sm:px-6'
            : 'max-w-7xl px-4 sm:px-6 lg:px-8'
        }`}
      >
        {/* Desktop Sidebar (can be collapsed in wide tree mode) */}
        {!(currentTab === 'tree' && isTreeExpanded) && (
          <Sidebar
            currentTab={currentTab}
            onSelectTab={(t) => setCurrentTab(t)}
            user={userProfile}
            onLogout={logout}
          />
        )}

        {/* Dynamic Tab Views */}
        <main className="flex-1 min-w-0">
          {loadingData ? (
            <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center text-stone-500 shadow-xs">
              <div className="inline-block w-8 h-8 border-3 border-emerald-800 border-t-transparent rounded-full animate-spin mb-3" />
              <h3 className="text-sm font-semibold text-stone-800">
                Memuat Data Silsilah Bani Nali...
              </h3>
              <p className="text-xs text-stone-400 mt-1">
                Mengambil data langsung dari Cloud Firestore.
              </p>
            </div>
          ) : dataError ? (
            <div className="bg-red-50 rounded-2xl border border-red-200 p-8 text-center text-red-900 shadow-xs">
              <h3 className="text-base font-bold text-red-800">
                Terjadi Kesalahan Koneksi Data
              </h3>
              <p className="text-xs text-red-700 mt-1 max-w-md mx-auto">
                {dataError}
              </p>
              <button
                onClick={() => window.location.reload()}
                className="mt-4 px-4 py-2 bg-red-800 hover:bg-red-900 text-white rounded-xl text-xs font-semibold cursor-pointer"
              >
                Coba Muat Ulang
              </button>
            </div>
          ) : (
            <>
              {currentTab === 'dashboard' && (
                <DashboardView
                  user={userProfile}
                  members={members}
                  events={events}
                  onNavigateTab={(t) => setCurrentTab(t)}
                  onSelectMember={(m) => setSelectedMember(m)}
                  onSeedInitialData={handleSeedData}
                />
              )}

              {currentTab === 'tree' && (
                <div className="space-y-4 mb-16">
                  <div className="bg-white p-4 sm:p-5 rounded-2xl border border-stone-200/90 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h2 className="text-xl font-bold font-serif-heritage text-stone-900">
                        Bagan Silsilah Interaktif (Family Tree)
                      </h2>
                      <p className="text-xs text-stone-500 mt-0.5">
                        Silsilah pohon keluarga dinamis dari relasi parentID dan spouseID di Cloud Firestore
                      </p>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      <button
                        onClick={() => setIsTreeExpanded(!isTreeExpanded)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                          isTreeExpanded
                            ? 'bg-emerald-900 text-white shadow-xs'
                            : 'bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-200'
                        }`}
                        title={
                          isTreeExpanded
                            ? 'Kembalikan lebar standar dengan sidebar'
                            : 'Lebarkan tampilan silsilah (sembunyikan sidebar)'
                        }
                      >
                        <Maximize2 className="w-3.5 h-3.5" />
                        <span>{isTreeExpanded ? 'Tampilkan Sidebar' : 'Mode Layar Luas'}</span>
                      </button>

                      <button
                        onClick={() => setIsPrintModalOpen(true)}
                        className="px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 bg-amber-800 hover:bg-amber-900 text-white shadow-xs transition-all cursor-pointer hover:shadow-md"
                        title="Cetak & Unduh Silsilah Jadi PDF dan PNG Berbingkai Vintage"
                      >
                        <Printer className="w-3.5 h-3.5 text-amber-200" />
                        <span className="font-serif">Cetak Silsilah (PDF/PNG)</span>
                      </button>
                    </div>
                  </div>

                  <FamilyTreeViewer
                    members={members}
                    onSelectMember={(m) => setSelectedMember(m)}
                    highlightedMemberId={highlightedTreeMemberId}
                  />
                </div>
              )}

              {currentTab === 'directory' && (
                <MemberDirectory
                  members={members}
                  isAdmin={isAdmin}
                  onSelectMember={(m) => setSelectedMember(m)}
                  onAddNewMember={() => setCurrentTab('admin')}
                />
              )}

              {currentTab === 'relationship' && (
                <RelationshipCalculatorView
                  members={members}
                  onSelectMember={(m) => setSelectedMember(m)}
                />
              )}

              {currentTab === 'events' && (
                <EventsView
                  events={events}
                  isAdmin={isAdmin}
                  onAddEvent={() => setCurrentTab('admin')}
                  onEditEvent={() => setCurrentTab('admin')}
                />
              )}

              {currentTab === 'profile' && (
                <UserProfileView
                  user={userProfile}
                  members={members}
                  onRefreshUser={refreshUserProfile}
                  onSelectMember={(m) => setSelectedMember(m)}
                />
              )}

              {currentTab === 'admin' && isAdmin && (
                <AdminPanel
                  members={members}
                  events={events}
                  onRefreshData={() => {}}
                  onSelectMember={(m) => setSelectedMember(m)}
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* Mobile Nav & Drawer */}
      <MobileNav
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        currentTab={currentTab}
        onSelectTab={(t) => setCurrentTab(t)}
        user={userProfile}
        onLogout={logout}
      />

      {/* Detail Member Modal */}
      <MemberProfileModal
        member={selectedMember}
        allMembers={members}
        isAdmin={isAdmin}
        onClose={() => setSelectedMember(null)}
        onSelectMember={(m) => setSelectedMember(m)}
        onOpenTreeWithMember={handleOpenTreeWithMember}
        onEditMember={() => {
          setSelectedMember(null);
          setCurrentTab('admin');
        }}
      />

      {/* Modal Cetak Silsilah Jadi PDF dan PNG Berbingkai Vintage */}
      <PrintExportFamilyTreeModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        members={members}
      />

      {/* Footer */}
      <footer className="mt-auto py-6 bg-white border-t border-stone-200 text-center text-xs text-stone-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-serif-heritage font-bold text-stone-900">BANI NALI</span>
            <span className="text-stone-300">|</span>
            <span className="text-stone-600">Family Heritage & Genealogy</span>
          </div>
          <p className="text-stone-400">
            Platform Silsilah & Warisan Keluarga Bani Nali. Hak Cipta &copy; {new Date().getFullYear()}.
          </p>
        </div>
      </footer>
    </div>
  );
};
