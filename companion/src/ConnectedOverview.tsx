import { getCraftingGoals } from "./crafting";
import type { Character } from "./domain";
import { getDungeonGoals, getQuestGoals } from "./acquisition";
import { acquisitionDataset } from "./data/acquisitionCatalogue";
import { characterHash } from "./navigation";
import { getRouteProgress } from "./routeBuilder";
import "./connectedOverview.css";

export function ConnectedOverview({ character }: { character: Character }) {
  const crafting = getCraftingGoals(character, acquisitionDataset).filter(g => g.goal.tracked || g.wishlistEntry?.status === "wanted");
  const outstandingCrafting = crafting.filter(g => g.wishlistEntry?.status !== "acquired");
  const state = character.acquisition;
  const quests = getQuestGoals(state, acquisitionDataset, character.level);
  const pending = quests.filter((q) => q.progress.status !== "completed");
  const dungeons = getDungeonGoals(state, acquisitionDataset);
  const wanted = state.wishlist.filter((e) => e.status === "wanted");
  const acquired = state.wishlist.filter((e) => e.status === "acquired");
  const activeChains = state.manualChains.filter((chain) =>
    chain.questIds.some(
      (id) =>
        state.questProgress.find((q) => q.questId === id)?.status !==
        "completed",
    ),
  );
  const route = getRouteProgress(character.planner, character.level);
  const stops = character.planner.entries.filter((e) => e.kind !== "custom");
  const finished = stops.filter((e) => e.status === "completed").length;
  const plannedDungeons = character.planner.entries.filter(
    (e) => e.kind === "dungeon" && !["completed", "skipped"].includes(e.status),
  );
  const linked = new Set([
    ...pending
      .filter((q) => q.desiredItems.length)
      .map((q) => `quest:${q.questId}`),
    ...dungeons
      .filter((d) => d.items.length)
      .map((d) => `dungeon:${d.dungeonId}`),
  ]);
  const next = route.current ?? route.next;
  const items = [...acquisitionDataset.items, ...state.manualItems];
  return (
    <section className="connected-overview" aria-label="Connected progression">
      <a
        className="panel overview-summary"
        href={`#${characterHash(character.id, "leveling")}`}
      >
        <span className="eyebrow">LEVELING ROUTE</span>
        <strong>
          {finished}
          <small> / {stops.length} stops completed</small>
        </strong>
        <p>
          {next
            ? `Next planned stop: ${next.title}`
            : stops.length
              ? "No pending route stop"
              : "Plan your first zone"}
        </p>
        <span className="text-gold">Open Leveling Route →</span>
      </a>
      <a
        className="panel overview-summary"
        href={`#${characterHash(character.id, "equipment")}`}
      >
        <span className="eyebrow">EQUIPMENT GOALS</span>
        <strong>
          {wanted.length}
          <small> wanted · {acquired.length} acquired</small>
        </strong>
        <p>
          {linked.size} outstanding linked{" "}
          {linked.size === 1 ? "goal" : "goals"}
        </p>
        {!!wanted.length && (
          <p className="summary-preview">
            {wanted
              .slice(0, 2)
              .map(
                (e) =>
                  items.find((i) => i.id === e.itemId)?.name ??
                  "Unresolved item",
              )
              .join(" · ")}
          </p>
        )}
        <span className="text-gold">Open Equipment →</span>
      </a>
      <a
        className="panel overview-summary"
        href={`#${characterHash(character.id, "quests")}`}
      >
        <span className="eyebrow">QUEST PROGRESS</span>
        <strong>
          {pending.length}
          <small> outstanding · {activeChains.length} active chains</small>
        </strong>
        <p>
          {pending.filter((q) => q.desiredItems.length).length} quests with
          desired rewards
        </p>
        {!!pending.length && (
          <p className="summary-preview">
            {pending
              .slice(0, 2)
              .map((q) => q.quest?.name ?? "Unresolved quest")
              .join(" · ")}
          </p>
        )}
        <span className="text-gold">Open Quests →</span>
      </a>
      <a
        className="panel overview-summary"
        href={`#${characterHash(character.id, "dungeons")}`}
      >
        <span className="eyebrow">DUNGEON GOALS</span>
        <strong>
          {dungeons.filter((d) => d.items.length).length}
          <small> dungeons with desired items</small>
        </strong>
        <p>
          {plannedDungeons.length} pending route milestones ·{" "}
          {state.dungeonProgress.reduce(
            (total, d) => total + d.runsCompleted,
            0,
          )}{" "}
          runs recorded
        </p>
        {!!dungeons.length && (
          <p className="summary-preview">
            {dungeons
              .slice(0, 2)
              .map((d) => d.dungeon?.name ?? "Unresolved dungeon")
              .join(" · ")}
          </p>
        )}
        <span className="text-gold">Open Dungeons →</span>
      </a>
      <a className="panel overview-summary" href={`#${characterHash(character.id, "professions")}`}>
        <span className="eyebrow">CRAFTING PREPARATION</span><strong>{outstandingCrafting.length}<small> outstanding crafting goals</small></strong>
        <p>{character.crafting.professions.length} professions recorded · {crafting.filter(g => g.goal.crafted).length} crafts completed</p>
        <p className="summary-preview">{outstandingCrafting.slice(0, 2).map(g => g.item?.name ?? g.recipe?.name ?? "Unresolved recipe").join(" · ") || "Plan crafted equipment and materials"}</p>
        <span className="text-gold">Open Professions →</span>
      </a>
    </section>
  );
}
