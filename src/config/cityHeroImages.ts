/**
 * FlyttGo Skyline Hero Image Registry
 *
 * Commercial-use-safe skyline images sourced from Unsplash.
 * Used automatically by:
 *
 *   /market-<country>   (capital city skyline — looked up by capital slug)
 *   /moving-<city>      (city skyline)
 *
 * Fallback handled in src/lib/expansion-hero-images.ts when a slug
 * isn't mapped here.
 */

export const CITY_HERO_IMAGES: Record<string, string> = {

  /* Netherlands */
  amsterdam:
    "https://images.unsplash.com/photo-1534351590666-13e3e96b5017?q=80&w=2400",
  rotterdam:
    "https://images.unsplash.com/photo-1562774053-701939374585?q=80&w=2400",
  utrecht:
    "https://images.unsplash.com/photo-1599150047006-2f5b6d85d6e7?q=80&w=2400",
  eindhoven:
    "https://images.unsplash.com/photo-1603204077779-bed963ea7f7f?q=80&w=2400",
  "the-hague":
    "https://images.unsplash.com/photo-1583767740569-4eaaad7c7d71?q=80&w=2400",

  /* Sweden */
  stockholm:
    "https://images.unsplash.com/photo-1509356843151-3e7d96241e11?q=80&w=2400",
  gothenburg:
    "https://images.unsplash.com/photo-1601315488950-3b5047998b38?q=80&w=2400",
  malmo:
    "https://images.unsplash.com/photo-1582560475093-ba66accbc424?q=80&w=2400",
  uppsala:
    "https://images.unsplash.com/photo-1610801473796-07d3d5e1e8f3?q=80&w=2400",
  vasteras:
    "https://images.unsplash.com/photo-1608658964123-3b33c4c1bb65?q=80&w=2400",

  /* Spain */
  madrid:
    "https://images.unsplash.com/photo-1543785734-4b54c1cba0bc?q=80&w=2400",
  barcelona:
    "https://images.unsplash.com/photo-1505739774128-9a36f7e0ef2d?q=80&w=2400",
  valencia:
    "https://images.unsplash.com/photo-1590490360182-c33d57733427?q=80&w=2400",
  seville:
    "https://images.unsplash.com/photo-1549640376-8b9f47f5d3c6?q=80&w=2400",
  malaga:
    "https://images.unsplash.com/photo-1549640376-8b9f47f5d3c6?q=80&w=2400",

  /* Italy */
  milan:
    "https://images.unsplash.com/photo-1526481280691-9060b3f81f67?q=80&w=2400",
  rome:
    "https://images.unsplash.com/photo-1526483360412-f4dbaf036963?q=80&w=2400",
  turin:
    "https://images.unsplash.com/photo-1584036561566-baf8f5f1b144?q=80&w=2400",
  bologna:
    "https://images.unsplash.com/photo-1562338809-5c5c6a5c2e70?q=80&w=2400",
  florence:
    "https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=2400",

  /* Poland */
  warsaw:
    "https://images.unsplash.com/photo-1519197924294-4ba991a11128?q=80&w=2400",
  krakow:
    "https://images.unsplash.com/photo-1568051243858-533a6078091a?q=80&w=2400",
  wroclaw:
    "https://images.unsplash.com/photo-1588416499018-8c2b0e0c9f4f?q=80&w=2400",
  gdansk:
    "https://images.unsplash.com/photo-1606820854416-439b3305ff39?q=80&w=2400",
  poznan:
    "https://images.unsplash.com/photo-1575909812264-6902b55846ad?q=80&w=2400",

  /* Denmark */
  copenhagen:
    "https://images.unsplash.com/photo-1509356843151-3e7d96241e11?q=80&w=2400",
  aarhus:
    "https://images.unsplash.com/photo-1600508774634-4e11d34730e2?q=80&w=2400",
  odense:
    "https://images.unsplash.com/photo-1583574928108-99c1df3c5b07?q=80&w=2400",
  aalborg:
    "https://images.unsplash.com/photo-1586964386127-9dfe3cbe43dc?q=80&w=2400",
  esbjerg:
    "https://images.unsplash.com/photo-1606166348153-2f66b34c34b7?q=80&w=2400",

  /* Belgium */
  brussels:
    "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?q=80&w=2400",
  antwerp:
    "https://images.unsplash.com/photo-1589394815804-964ed0be2eb5?q=80&w=2400",
  ghent:
    "https://images.unsplash.com/photo-1563298723-dcfebaa392e3?q=80&w=2400",
  leuven:
    "https://images.unsplash.com/photo-1586611292717-f828b167408c?q=80&w=2400",
  liege:
    "https://images.unsplash.com/photo-1593875701300-55aabf3cf8f1?q=80&w=2400",

  /* Austria */
  vienna:
    "https://images.unsplash.com/photo-1516550893885-9850b9cbd15c?q=80&w=2400",
  graz:
    "https://images.unsplash.com/photo-1587654780291-39c9404d746b?q=80&w=2400",
  linz:
    "https://images.unsplash.com/photo-1589966342383-70f7db3d1b6a?q=80&w=2400",
  salzburg:
    "https://images.unsplash.com/photo-1543429257-3eb0b65d3f88?q=80&w=2400",
  innsbruck:
    "https://images.unsplash.com/photo-1601042879364-f3947d3f9c16?q=80&w=2400",

  /* Switzerland */
  zurich:
    "https://images.unsplash.com/photo-1505761671935-60b3a7427bad?q=80&w=2400",
  geneva:
    "https://images.unsplash.com/photo-1522098543979-ffc7f79d5d8e?q=80&w=2400",
  basel:
    "https://images.unsplash.com/photo-1605810230434-7631ac76ec81?q=80&w=2400",
  lausanne:
    "https://images.unsplash.com/photo-1568624234666-96cf51c42e61?q=80&w=2400",
  bern:
    "https://images.unsplash.com/photo-1571731956672-f2b94d7dd0cb?q=80&w=2400",

  /* Czech Republic */
  prague:
    "https://images.unsplash.com/photo-1541849546-216549ae216d?q=80&w=2400",
  brno:
    "https://images.unsplash.com/photo-1601042879364-f3947d3f9c16?q=80&w=2400",
  ostrava:
    "https://images.unsplash.com/photo-1591181520189-abcb0735c65d?q=80&w=2400",
  plzen:
    "https://images.unsplash.com/photo-1607082350899-7e105aa886ae?q=80&w=2400",
  liberec:
    "https://images.unsplash.com/photo-1593875701300-55aabf3cf8f1?q=80&w=2400",
};
