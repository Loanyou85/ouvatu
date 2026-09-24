import { limitsFor, type PlanId } from "@/config/plans";
import type { ContentItem, ItemView } from "@/types/domain";
import type { StructuredData } from "@/types/schemas";

/**
 * Premium gating applied SERVER-SIDE before data reaches the browser:
 * free users see the first N detected elements of list-like results.
 */
export function toItemView(item: ContentItem, plan: PlanId): ItemView {
  const limit = limitsFor(plan).previewEntities;
  if (!Number.isFinite(limit) || item.isExample) return { ...item, lockedCount: 0 };

  const data = structuredClone(item.data) as StructuredData;
  let locked = 0;
  const cut = <T,>(list: T[]): T[] => {
    if (list.length <= limit) return list;
    locked = list.length - limit;
    return list.slice(0, limit);
  };
  switch (data.category) {
    case "TRAVEL":
      data.travel.places = cut(data.travel.places);
      break;
    case "PLACES":
      data.places.places = cut(data.places.places);
      break;
    case "PRODUCTS":
      data.products.products = cut(data.products.products);
      break;
    case "MOVIES":
    case "SERIES":
      data.screen.titles = cut(data.screen.titles);
      break;
    case "BOOKS":
      data.books.books = cut(data.books.books);
      break;
    default:
      break;
  }
  const entities = locked ? item.entities.filter((e) => e.ref < limit) : item.entities;
  return { ...item, data, entities, lockedCount: locked };
}
