export type Gender = 'L' | 'P' | 'Laki-laki' | 'Perempuan';
export type PrivacyLevel = 'family' | 'public' | 'private';
export type UserRole = 'admin' | 'member';

export interface FamilyMember {
  id: string;
  name: string;
  birthDate?: string;
  deathDate?: string;
  gender: Gender;
  photoURL?: string;
  parentID?: string | null;
  spouseID?: string | null;
  spouseIDs?: string[];
  bio?: string;
  birthPlace?: string;
  address?: string;
  phone?: string;
  privacy?: PrivacyLevel;
  lineageStatus?: 'trah' | 'mantu' | 'keluarga_pasangan' | 'lainnya';
  relationshipNote?: string;
  familyBranch?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface UserProfile {
  uid: string;
  username?: string;
  email: string;
  displayName?: string;
  role: UserRole;
  linkedMemberID?: string;
  photoURL?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FamilyEvent {
  id: string;
  namaAcara: string;
  tanggal: string;
  tempat: string;
  deskripsi?: string;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AppConfig {
  appName: string;
  tagline: string;
  announcement?: string;
  updatedAt?: string;
}

export interface RelationshipResult {
  personA: FamilyMember;
  personB: FamilyMember;
  relationshipName: string;
  relationshipType: 'direct' | 'sibling' | 'ancestor' | 'descendant' | 'inlaw' | 'cousin' | 'distant' | 'self';
  description: string;
  path: Array<{
    member: FamilyMember;
    relationToNext?: string;
  }>;
  commonAncestor?: FamilyMember;
}
