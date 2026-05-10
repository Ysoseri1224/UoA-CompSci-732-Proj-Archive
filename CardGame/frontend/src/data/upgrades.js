// Mirrors backend types/buff.ts — upgrade pool definitions for the roguelike mode

  export const FIRST_LAYER_UPGRADES = [
    { id: 'water_spec',  label: 'Water Mastery',  desc: 'WATER cards chip x1.1', element: 'WATER',
      buff: { type: 'ELEMENT_CHIP_MULT', element: 'WATER', mult: 1.1 } },
    { id: 'fire_spec',   label: 'Fire Mastery',   desc: 'FIRE cards chip x1.1',  element: 'FIRE',
      buff: { type: 'ELEMENT_CHIP_MULT', element: 'FIRE',  mult: 1.1 } },
    { id: 'grass_spec',  label: 'Nature Mastery', desc: 'NATURE cards chip x1.1', element: 'GRASS',
      buff: { type: 'ELEMENT_CHIP_MULT', element: 'GRASS', mult: 1.1 } },
  ];
  
  export function generateUpgradePool(chosenElement, layer) {
    const pool = [
      { id: `${chosenElement}_mult_${layer}`, label: `${chosenElement} Boost`,
        desc: `${chosenElement} cards chip x1.1 (stackable)`, element: chosenElement,
        buff: { type: 'ELEMENT_CHIP_MULT', element: chosenElement, mult: 1.1 } },
      { id: `${chosenElement}_draw_${layer}`, label: 'Elemental Draw',
        desc: `Shuffle guarantees a ${chosenElement} card`, element: chosenElement,
        buff: { type: 'ELEMENT_DRAW_ON_SHUFFLE', element: chosenElement } },
      { id: `high_rank_draw_${layer}`, label: 'High Card Draw',
        desc: 'Shuffle guarantees a K (rank 13) card', icon: '/images/icon-kcard.png',
        buff: { type: 'HIGH_RANK_DRAW_ON_SHUFFLE' } },
    ];
    const a = [...pool];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a.slice(0, 3);
  }