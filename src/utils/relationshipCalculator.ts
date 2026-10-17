import { FamilyMember, RelationshipResult } from '../types';
import { getMemberSpouseIds, getMemberSpouses } from './familyTreeUtils';
import { isMale, isFemale } from './genderUtils';

export function calculateRelationship(
  personA: FamilyMember,
  personB: FamilyMember,
  members: FamilyMember[]
): RelationshipResult {
  if (personA.id === personB.id) {
    return {
      personA,
      personB,
      relationshipName: 'Diri Sendiri',
      relationshipType: 'self',
      description: 'Orang yang dipilih adalah individu yang sama.',
      path: [{ member: personA }],
    };
  }

  const memberMap = new Map<string, FamilyMember>();
  members.forEach((m) => memberMap.set(m.id, m));

  const spouseIdsA = getMemberSpouseIds(personA, members);
  const spouseIdsB = getMemberSpouseIds(personB, members);

  // 1. Cek Pasangan Langsung (Mendukung 1 atau Lebih Pasangan)
  if (spouseIdsA.includes(personB.id) || spouseIdsB.includes(personA.id)) {
    const isWife = isFemale(personB.gender);
    const spousesA = getMemberSpouses(personA, members);
    const spouseIdx = spousesA.findIndex((s) => s.id === personB.id);
    const orderText = spousesA.length > 1 && spouseIdx >= 0 ? ` ke-${spouseIdx + 1}` : '';
    const relName = `${isWife ? 'Istri' : 'Suami'}${orderText}`;

    return {
      personA,
      personB,
      relationshipName: relName,
      relationshipType: 'direct',
      description: `${personB.name} adalah ${relName} sah dari ${personA.name}${
        personB.deathDate ? ' (Almarhumah)' : ''
      }.`,
      path: [
        { member: personA, relationToNext: `menikah dengan (${relName})` },
        { member: personB },
      ],
    };
  }

  // 2. Cek Hubungan Orang Tua - Anak Kandung Langsung
  const isDirectChild = (child: FamilyMember, parent: FamilyMember) => {
    if (!child.parentID) return false;
    const pIds = child.parentID.split(/[,;]+/).map((p) => p.trim());
    return pIds.includes(parent.id);
  };

  if (isDirectChild(personB, personA)) {
    const isSon = isMale(personB.gender);
    return {
      personA,
      personB,
      relationshipName: isSon ? 'Anak Laki-laki' : 'Anak Perempuan',
      relationshipType: 'direct',
      description: `${personB.name} adalah anak kandung dari ${personA.name}.`,
      path: [
        { member: personA, relationToNext: 'orang tua dari' },
        { member: personB },
      ],
    };
  }

  if (isDirectChild(personA, personB)) {
    const isFather = isMale(personB.gender);
    return {
      personA,
      personB,
      relationshipName: isFather ? 'Ayah Kandung' : 'Ibu Kandung',
      relationshipType: 'direct',
      description: `${personB.name} adalah ${isFather ? 'ayah' : 'ibu'} kandung dari ${personA.name}.`,
      path: [
        { member: personA, relationToNext: 'anak dari' },
        { member: personB },
      ],
    };
  }

  // 3. Cek Hubungan Orang Tua Sambung / Anak Sambung (Kasus Pasangan Lain)
  for (const sId of spouseIdsA) {
    const spouseA = memberMap.get(sId);
    if (spouseA && isDirectChild(personB, spouseA)) {
      const isSon = isMale(personB.gender);
      return {
        personA,
        personB,
        relationshipName: isSon ? 'Anak Sambung Laki-laki' : 'Anak Sambung Perempuan',
        relationshipType: 'inlaw',
        description: `${personB.name} adalah anak sambung dari ${personA.name} (anak dari pasangan ${spouseA.name}).`,
        path: [
          { member: personA, relationToNext: 'menikah dengan' },
          { member: spouseA, relationToNext: 'orang tua dari' },
          { member: personB },
        ],
      };
    }
  }

  for (const sId of spouseIdsB) {
    const spouseB = memberMap.get(sId);
    if (spouseB && isDirectChild(personA, spouseB)) {
      const isMaleB = isMale(personB.gender);
      return {
        personA,
        personB,
        relationshipName: isMaleB ? 'Ayah Sambung' : 'Ibu Sambung',
        relationshipType: 'inlaw',
        description: `${personB.name} adalah ${isMaleB ? 'ayah sambung' : 'ibu sambung'} dari ${personA.name} (pasangan dari ${spouseB.name}).`,
        path: [
          { member: personA, relationToNext: 'anak kandung dari' },
          { member: spouseB, relationToNext: 'menikah dengan' },
          { member: personB },
        ],
      };
    }
  }

  // Helper untuk melacak leluhur (ancestor tree) dengan jarak generasi
  const getAncestors = (memberId: string): Map<string, { distance: number; path: string[] }> => {
    const ancestors = new Map<string, { distance: number; path: string[] }>();
    ancestors.set(memberId, { distance: 0, path: [memberId] });

    const queue: Array<{ id: string; dist: number; p: string[] }> = [{ id: memberId, dist: 0, p: [memberId] }];
    const visited = new Set<string>([memberId]);

    while (queue.length > 0) {
      const current = queue.shift()!;
      const m = memberMap.get(current.id);
      if (!m) continue;

      // Cek parent kandung
      if (m.parentID) {
        const pIds = m.parentID.split(/[,;]+/).map((p) => p.trim());
        pIds.forEach((pId) => {
          if (!visited.has(pId)) {
            visited.add(pId);
            const nextDist = current.dist + 1;
            const nextPath = [...current.p, pId];
            ancestors.set(pId, { distance: nextDist, path: nextPath });
            queue.push({ id: pId, dist: nextDist, p: nextPath });
          }
        });
      }

      // Cek parent dari semua pasangan
      const spousesOfM = getMemberSpouseIds(m, members);
      spousesOfM.forEach((sId) => {
        const spouse = memberMap.get(sId);
        if (spouse && spouse.parentID) {
          const spIds = spouse.parentID.split(/[,;]+/).map((p) => p.trim());
          spIds.forEach((pId) => {
            if (!visited.has(pId)) {
              visited.add(pId);
              const nextDist = current.dist + 1;
              const nextPath = [...current.p, pId];
              ancestors.set(pId, { distance: nextDist, path: nextPath });
              queue.push({ id: pId, dist: nextDist, p: nextPath });
            }
          });
        }
      });
    }

    return ancestors;
  };

  const ancestorsA = getAncestors(personA.id);
  const ancestorsB = getAncestors(personB.id);

  // Cari Lowest Common Ancestor (LCA)
  let lcaId: string | null = null;
  let minSumDist = Infinity;

  ancestorsA.forEach((dataA, ancestorId) => {
    if (ancestorId !== personA.id && ancestorId !== personB.id && ancestorsB.has(ancestorId)) {
      const dataB = ancestorsB.get(ancestorId)!;
      const sumDist = dataA.distance + dataB.distance;
      if (sumDist < minSumDist) {
        minSumDist = sumDist;
        lcaId = ancestorId;
      }
    }
  });

  if (lcaId) {
    const lcaMember = memberMap.get(lcaId)!;
    const distA = ancestorsA.get(lcaId)!.distance;
    const distB = ancestorsB.get(lcaId)!.distance;
    const isMaleB = isMale(personB.gender);

    // 1. Saudara (distA = 1, distB = 1)
    if (distA === 1 && distB === 1) {
      const isOlder = (personB.birthDate || '9999') < (personA.birthDate || '9999');
      const label = isOlder
        ? isMaleB ? 'Kakak Laki-laki' : 'Kakak Perempuan'
        : isMaleB ? 'Adik Laki-laki' : 'Adik Perempuan';

      return {
        personA,
        personB,
        relationshipName: label,
        relationshipType: 'sibling',
        description: `${personB.name} adalah saudara (${label}) dari ${personA.name} melalui jalur orang tua yang sama (${lcaMember.name}).`,
        path: [
          { member: personA, relationToNext: 'anak dari' },
          { member: lcaMember, relationToNext: 'orang tua dari' },
          { member: personB },
        ],
        commonAncestor: lcaMember,
      };
    }

    // 2. Kakek / Nenek (distA = 2, distB = 0)
    if (distA === 2 && distB === 0) {
      return {
        personA,
        personB,
        relationshipName: isMaleB ? 'Kakek' : 'Nenek',
        relationshipType: 'ancestor',
        description: `${personB.name} adalah ${isMaleB ? 'kakek' : 'nenek'} dari ${personA.name}.`,
        path: [
          { member: personA, relationToNext: 'cucu dari' },
          { member: personB },
        ],
        commonAncestor: lcaMember,
      };
    }

    // 3. Cucu (distA = 0, distB = 2)
    if (distA === 0 && distB === 2) {
      return {
        personA,
        personB,
        relationshipName: isMaleB ? 'Cucu Laki-laki' : 'Cucu Perempuan',
        relationshipType: 'descendant',
        description: `${personB.name} adalah cucu dari ${personA.name}.`,
        path: [
          { member: personA, relationToNext: 'kakek/nenek dari' },
          { member: personB },
        ],
        commonAncestor: lcaMember,
      };
    }

    // 4. Paman / Bibi (distA = 2, distB = 1)
    if (distA === 2 && distB === 1) {
      const label = isMaleB ? 'Paman (Om / Pakde / Paklek)' : 'Bibi (Tante / Bude / Buklek)';
      return {
        personA,
        personB,
        relationshipName: label,
        relationshipType: 'direct',
        description: `${personB.name} adalah ${label} dari ${personA.name} (saudara dari orang tua ${personA.name}).`,
        path: [
          { member: personA, relationToNext: 'cucu dari' },
          { member: lcaMember, relationToNext: 'orang tua dari' },
          { member: personB },
        ],
        commonAncestor: lcaMember,
      };
    }

    // 5. Keponakan (distA = 1, distB = 2)
    if (distA === 1 && distB === 2) {
      const label = isMaleB ? 'Keponakan Laki-laki' : 'Keponakan Perempuan';
      return {
        personA,
        personB,
        relationshipName: label,
        relationshipType: 'direct',
        description: `${personB.name} adalah ${label} dari ${personA.name} (anak dari saudara ${personA.name}).`,
        path: [
          { member: personA, relationToNext: 'anak dari' },
          { member: lcaMember, relationToNext: 'kakek/nenek dari' },
          { member: personB },
        ],
        commonAncestor: lcaMember,
      };
    }

    // 6. Sepupu Satu Kali / Misanan (distA = 2, distB = 2)
    if (distA === 2 && distB === 2) {
      return {
        personA,
        personB,
        relationshipName: 'Sepupu Satu Kali (Misanan)',
        relationshipType: 'cousin',
        description: `${personB.name} adalah sepupu satu kali (misanan) dari ${personA.name}, berbagi kakek/nenek yang sama (${lcaMember.name}).`,
        path: [
          { member: personA, relationToNext: 'cucu dari' },
          { member: lcaMember, relationToNext: 'kakek/nenek dari' },
          { member: personB },
        ],
        commonAncestor: lcaMember,
      };
    }

    // 7. Sepupu Dua Kali / Mindon (distA = 3, distB = 3)
    if (distA === 3 && distB === 3) {
      return {
        personA,
        personB,
        relationshipName: 'Sepupu Dua Kali (Mindon)',
        relationshipType: 'cousin',
        description: `${personB.name} adalah sepupu dua kali (mindon) dari ${personA.name}, berbagi buyut yang sama (${lcaMember.name}).`,
        path: [
          { member: personA, relationToNext: 'cicit dari' },
          { member: lcaMember, relationToNext: 'buyut dari' },
          { member: personB },
        ],
        commonAncestor: lcaMember,
      };
    }

    // Buyut / Cicit
    if (distA === 3 && distB === 0) {
      return {
        personA,
        personB,
        relationshipName: isMaleB ? 'Buyut Laki-laki' : 'Buyut Perempuan',
        relationshipType: 'ancestor',
        description: `${personB.name} adalah buyut dari ${personA.name}.`,
        path: [{ member: personA }, { member: personB }],
        commonAncestor: lcaMember,
      };
    }

    if (distA === 0 && distB === 3) {
      return {
        personA,
        personB,
        relationshipName: isMaleB ? 'Cicit Laki-laki' : 'Cicit Perempuan',
        relationshipType: 'descendant',
        description: `${personB.name} adalah cicit dari ${personA.name}.`,
        path: [{ member: personA }, { member: personB }],
        commonAncestor: lcaMember,
      };
    }
  }

  // 4. Hubungan Mertua / Ipar / Menantu (Affinal / Marital Relations via Multiple Spouses)
  for (const sId of spouseIdsA) {
    const spouseA = memberMap.get(sId);
    if (spouseA) {
      // Mertua (Orang tua dari salah satu pasangan)
      if (spouseA.parentID) {
        const spPIds = spouseA.parentID.split(/[,;]+/).map((p) => p.trim());
        if (spPIds.includes(personB.id)) {
          const isFatherInLaw = isMale(personB.gender);
          return {
            personA,
            personB,
            relationshipName: isFatherInLaw ? 'Ayah Mertua' : 'Ibu Mertua',
            relationshipType: 'inlaw',
            description: `${personB.name} adalah ${isFatherInLaw ? 'ayah mertua' : 'ibu mertua'} dari ${personA.name} (orang tua dari ${spouseA.name}).`,
            path: [
              { member: personA, relationToNext: 'menikah dengan' },
              { member: spouseA, relationToNext: 'anak dari' },
              { member: personB },
            ],
          };
        }
      }

      // Ipar (Saudara kandung dari salah satu pasangan)
      if (spouseA.parentID && personB.parentID && spouseA.parentID === personB.parentID) {
        return {
          personA,
          personB,
          relationshipName: 'Saudara Ipar',
          relationshipType: 'inlaw',
          description: `${personB.name} adalah saudara ipar dari ${personA.name} (saudara dari pasangan ${spouseA.name}).`,
          path: [
            { member: personA, relationToNext: 'menikah dengan' },
            { member: spouseA, relationToNext: 'saudara dari' },
            { member: personB },
          ],
        };
      }
    }
  }

  // Menantu (Pasangan dari salah satu anak)
  const childrenA = members.filter((m) => isDirectChild(m, personA));
  for (const child of childrenA) {
    const childSpouseIds = getMemberSpouseIds(child, members);
    if (childSpouseIds.includes(personB.id)) {
      return {
        personA,
        personB,
        relationshipName: isMale(personB.gender) ? 'Menantu Laki-laki' : 'Menantu Perempuan',
        relationshipType: 'inlaw',
        description: `${personB.name} adalah menantu dari ${personA.name} (pasangan dari ${child.name}).`,
        path: [
          { member: personA, relationToNext: 'orang tua dari' },
          { member: child, relationToNext: 'menikah dengan' },
          { member: personB },
        ],
      };
    }
  }

  // Besan (Orang tua dari menantu)
  for (const child of childrenA) {
    const childSpouseIds = getMemberSpouseIds(child, members);
    for (const cSpouseId of childSpouseIds) {
      const childSpouse = memberMap.get(cSpouseId);
      if (childSpouse && childSpouse.parentID) {
        const spPIds = childSpouse.parentID.split(/[,;]+/).map((p) => p.trim());
        if (spPIds.includes(personB.id)) {
          return {
            personA,
            personB,
            relationshipName: 'Besan',
            relationshipType: 'inlaw',
            description: `${personB.name} adalah besan dari ${personA.name} (orang tua dari pasangan anak ${child.name}).`,
            path: [
              { member: personA, relationToNext: 'orang tua dari' },
              { member: child, relationToNext: 'menikah dengan' },
              { member: childSpouse, relationToNext: 'anak dari' },
              { member: personB },
            ],
          };
        }
      }
    }
  }

  // Fallback: Kerabat dalam Trah Bani Nali
  return {
    personA,
    personB,
    relationshipName: 'Kerabat Keluarga Besar',
    relationshipType: 'distant',
    description: `${personA.name} dan ${personB.name} terhubung dalam ikatan silaturahmi keluarga besar Bani Nali.`,
    path: [{ member: personA }, { member: personB }],
  };
}
