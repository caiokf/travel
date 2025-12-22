import type { Waypoint, StorySection } from '../types'

// Waypoint coordinates for Western Europe journey (2000 x 1400 viewBox)
// Route: Lisbon → Sevilla → Granada → Barcelona → Montpellier → Lyon → Paris
export const waypoints: Waypoint[] = [
  {
    id: 'lisbon',
    name: 'Lisboa',
    x: 180,
    y: 780,
    pathPosition: 0
  },
  {
    id: 'sevilla',
    name: 'Sevilla',
    x: 340,
    y: 840,
    pathPosition: 0.14
  },
  {
    id: 'granada',
    name: 'Granada',
    x: 480,
    y: 860,
    pathPosition: 0.28
  },
  {
    id: 'barcelona',
    name: 'Barcelona',
    x: 840,
    y: 680,
    pathPosition: 0.50
  },
  {
    id: 'montpellier',
    name: 'Montpellier',
    x: 1020,
    y: 600,
    pathPosition: 0.65
  },
  {
    id: 'lyon',
    name: 'Lyon',
    x: 1060,
    y: 480,
    pathPosition: 0.80
  },
  {
    id: 'paris',
    name: 'Paris',
    x: 920,
    y: 240,
    pathPosition: 1
  }
]

export const storySections: StorySection[] = [
  {
    id: 'lisbon',
    waypointId: 'lisbon',
    title: 'Lisboa',
    subtitle: 'Where the Journey Begins',
    intro: 'The cobblestone streets of Alfama echoed with the melancholic strains of fado as we began our grand European adventure.',
    blocks: [
      {
        type: 'paragraph',
        content: 'Lisbon greeted us with golden light reflecting off the Tagus River, the city\'s seven hills rising like ancient guardians. We wandered through the narrow alleys of Alfama, the oldest district, where laundry hung between buildings and the scent of grilled sardines filled the air.'
      },
      {
        type: 'paragraph',
        content: 'The famous Tram 28 rattled past us, climbing impossibly steep streets. From the Miradouro da Senhora do Monte, we gazed across terracotta rooftops to the distant sea—the same waters that once launched Portuguese explorers to the ends of the earth.'
      },
      {
        type: 'image',
        src: '/img/journey/1.jpg',
        caption: 'The historic streets of Lisbon, where every corner tells a story of maritime glory'
      },
      {
        type: 'paragraph',
        content: 'In the evenings, we savored pastéis de nata at a centuries-old bakery, the custard tarts still warm from the oven. Lisbon taught us that some journeys begin not with departure, but with the quiet anticipation of what lies ahead.'
      }
    ]
  },
  {
    id: 'sevilla',
    waypointId: 'sevilla',
    title: 'Sevilla',
    subtitle: 'The Heart of Andalusia',
    blocks: [
      {
        type: 'paragraph',
        content: 'Crossing into Spain, the landscape transformed into rolling olive groves and sun-baked plains. Sevilla appeared like a mirage—its Moorish towers and orange-tree-lined plazas promising the romance of old Andalusia.'
      },
      {
        type: 'paragraph',
        content: 'The Real Alcázar stunned us into silence. Centuries of Islamic and Christian architecture intertwined in impossible beauty—intricate tilework, carved stucco, and gardens where peacocks wandered among fountains. We spent hours lost in its labyrinthine rooms.'
      },
      {
        type: 'image',
        src: '/img/journey/2.jpg',
        caption: 'The magnificent architecture of Sevilla, where Moorish and Spanish cultures intertwine'
      },
      {
        type: 'paragraph',
        content: 'At night, in a cramped tablao in Triana, we witnessed flamenco in its purest form. The dancer\'s heels struck the wooden floor like thunder, her movements telling stories of passion and heartbreak that transcended language. We understood then why Sevilla is called the soul of Spain.'
      }
    ]
  },
  {
    id: 'granada',
    waypointId: 'granada',
    title: 'Granada',
    subtitle: 'The Last Moorish Kingdom',
    blocks: [
      {
        type: 'paragraph',
        content: 'The road to Granada wound through the Sierra Nevada, snow-capped peaks watching over the last stronghold of Moorish Spain. Here, in 1492, the Reconquista ended—and a civilization\'s eight-hundred-year chapter closed.'
      },
      {
        type: 'paragraph',
        content: 'Nothing prepares you for the Alhambra. The "Red Fortress" rises above the city, its walls seemingly plain from outside but concealing paradise within. The Nasrid Palaces left us breathless—every surface covered in geometric patterns, Arabic calligraphy praising God and beauty in equal measure.'
      },
      {
        type: 'image',
        src: '/img/journey/3.jpg',
        caption: 'The Alhambra, a testament to the sophistication of Moorish civilization'
      },
      {
        type: 'quote',
        content: 'Dale limosna, mujer, que no hay en la vida nada como la pena de ser ciego en Granada.',
        author: 'Francisco de Icaza — Give him alms, woman, for there is nothing in life so cruel as being blind in Granada'
      },
      {
        type: 'paragraph',
        content: 'In the Albaicín quarter, we found cave dwellings where Romani families still practice the zambra, an ancient form of flamenco. As the sun set, painting the Sierra Nevada in shades of rose and gold, we understood why Washington Irving chose to write his tales here.'
      }
    ]
  },
  {
    id: 'barcelona',
    waypointId: 'barcelona',
    title: 'Barcelona',
    subtitle: 'Gaudí\'s Dreamscape',
    blocks: [
      {
        type: 'paragraph',
        content: 'The Mediterranean coast led us to Barcelona, where Catalonia\'s proud capital sprawls between mountains and sea. Here, modernisme—Catalan Art Nouveau—transforms the city into a living gallery of impossible architecture.'
      },
      {
        type: 'paragraph',
        content: 'We stood before the Sagrada Família and wept. Gaudí\'s unfinished masterpiece, over 140 years in construction, defies description. Its spires reach toward heaven like melting candles, while inside, columns branch like trees in a stone forest, light streaming through stained glass in every color imaginable.'
      },
      {
        type: 'image',
        src: '/img/journey/4.jpg',
        caption: 'The whimsical genius of Gaudí transforms Barcelona into a dreamscape'
      },
      {
        type: 'paragraph',
        content: 'On Las Ramblas, we navigated crowds and street performers, stopping at La Boqueria market for jamón ibérico and fresh-squeezed orange juice. In the Gothic Quarter\'s medieval maze, we stumbled upon hidden plazas where locals gathered for evening aperitivos.'
      },
      {
        type: 'paragraph',
        content: 'Barcelona taught us that creativity knows no bounds—that with vision and persistence, even stone can dance.'
      }
    ]
  },
  {
    id: 'montpellier',
    waypointId: 'montpellier',
    title: 'Montpellier',
    subtitle: 'Gateway to Provence',
    blocks: [
      {
        type: 'paragraph',
        content: 'Crossing the Pyrenees into France, the landscape softened into lavender fields and vineyards. Montpellier welcomed us with the warmth of the South—a university city where medieval and modern coexist in easy harmony.'
      },
      {
        type: 'paragraph',
        content: 'The Place de la Comédie buzzed with café life, students and artists mingling beneath the three Graces fountain. We explored the Écusson, the old town\'s shell-shaped historic center, discovering hidden courtyards behind unassuming doors.'
      },
      {
        type: 'image',
        src: '/img/journey/5.jpg',
        caption: 'The sun-drenched elegance of southern France'
      },
      {
        type: 'paragraph',
        content: 'At a vineyard outside the city, we learned to distinguish Languedoc wines—bold reds that spoke of Mediterranean sun and ancient soil. The winemaker, whose family had tended these vines for generations, reminded us that great things require patience and time.'
      }
    ]
  },
  {
    id: 'lyon',
    waypointId: 'lyon',
    title: 'Lyon',
    subtitle: 'France\'s Gastronomic Heart',
    blocks: [
      {
        type: 'paragraph',
        content: 'The Rhône and Saône rivers converge at Lyon, creating a city of bridges and reflections. France\'s gastronomic capital has fed travelers for centuries—from Roman legions to silk merchants to modern pilgrims seeking culinary enlightenment.'
      },
      {
        type: 'paragraph',
        content: 'In the traboules—secret passageways threading through Renaissance buildings—we traced the routes once used by silk workers and Resistance fighters. The Vieux Lyon district revealed itself as a treasure chest of Gothic and Renaissance architecture.'
      },
      {
        type: 'image',
        src: '/img/journey/6.jpg',
        caption: 'Lyon\'s historic heart, where gastronomy meets history'
      },
      {
        type: 'paragraph',
        content: 'Our dinner at a traditional bouchon was transcendent. Quenelles de brochet, tablier de sapeur, praline tart—each dish a testament to Lyon\'s obsession with eating well. The chef, a third-generation Lyonnais, told us: "In Lyon, we don\'t cook to impress. We cook to nourish the soul."'
      },
      {
        type: 'paragraph',
        content: 'From the Basilica of Notre-Dame de Fourvière, we surveyed the city at twilight—a tapestry of terracotta roofs and church spires, the Alps visible in the distance, beckoning us northward.'
      }
    ]
  },
  {
    id: 'paris',
    waypointId: 'paris',
    title: 'Paris',
    subtitle: 'The City of Light',
    blocks: [
      {
        type: 'paragraph',
        content: 'All roads in France lead to Paris, and so did ours. The City of Light welcomed us with grey skies and golden stone, the Seine winding through monuments to human ambition and artistry.'
      },
      {
        type: 'paragraph',
        content: 'We stood beneath the Eiffel Tower as evening fell, watching it ignite with thousands of sparkling lights. We wandered the halls of the Louvre until our feet ached, lost ourselves in the bookstalls along the Left Bank, and sipped coffee at cafés where Hemingway and Gertrude Stein once debated art and life.'
      },
      {
        type: 'image',
        src: '/img/journey/7.jpg',
        caption: 'Paris, where every street corner is a masterpiece'
      },
      {
        type: 'paragraph',
        content: 'In Montmartre, we climbed to Sacré-Cœur and watched the city spread beneath us like a living map of our journey—from the distant Pyrenees we\'d crossed to the heart of European civilization.'
      },
      {
        type: 'quote',
        content: 'Paris is always a good idea.',
        author: 'Audrey Hepburn'
      },
      {
        type: 'paragraph',
        content: 'Our European odyssey ended where so many dreams begin. From Lisbon\'s fado to Paris\'s boulevards, we had traced a path through history, art, and the simple pleasures of good food and beautiful places. The journey transforms us—that is its gift.'
      }
    ]
  }
]

export const getWaypointById = (id: string): Waypoint | undefined => {
  return waypoints.find(w => w.id === id)
}

export const getSectionByWaypointId = (waypointId: string): StorySection | undefined => {
  return storySections.find(s => s.waypointId === waypointId)
}
