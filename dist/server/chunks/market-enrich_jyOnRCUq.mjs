//#region src/lib/fantasy/market-enrich.ts
/**
* La API de mercado a veces devuelve jugadores con el campo `team` vacío en
* `playerMaster`, aunque el catálogo global sí incluye su equipo. Esto hace que
* aparezcan "Sin equipo" en el mercado pese a pertenecer a un club real.
*
* Este helper enriquece los jugadores de mercado con el equipo del catálogo
* (`/players`) cuando falta el nombre o el slug. También repone `teamId` si
* viene a 0, ya que el motor usa ese identificador para fixtures y localía.
*/
function enrichMarketPlayers(market, allPlayers) {
	const catalogById = /* @__PURE__ */ new Map();
	for (const p of allPlayers) catalogById.set(p.id, p);
	return market.map((entry) => {
		const catalogPlayer = catalogById.get(entry.playerMaster.id);
		if (!catalogPlayer) return entry;
		const player = { ...entry.playerMaster };
		const catalogTeam = catalogPlayer.team;
		if (catalogTeam && (!player.team || !player.team.name || !player.team.slug)) player.team = { ...catalogTeam };
		const catalogTeamId = Number(catalogPlayer.teamId);
		if (Number.isFinite(catalogTeamId) && catalogTeamId > 0 && (!player.teamId || player.teamId === 0)) player.teamId = catalogTeamId;
		if (!player.team && Number.isFinite(catalogTeamId) && catalogTeamId > 0) player.team = {
			id: String(catalogTeamId),
			name: "",
			slug: ""
		};
		return {
			...entry,
			playerMaster: player
		};
	});
}
//#endregion
export { enrichMarketPlayers as t };
