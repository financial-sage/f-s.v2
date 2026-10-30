/** Map pocket/fund name → legacy tile id (then mapped to family_categories). */
export function categoryIdFromFundName(fundName?: string | null): string {
  const raw = (fundName ?? "").trim().toLowerCase();
  if (!raw) return "misc";

  const rules: { re: RegExp; id: string }[] = [
    { re: /restaurant|comida|food|cena|almuerzo|merienda|bar|cafe|café/, id: "dining" },
    { re: /super|mercado|compra|grocery/, id: "super" },
    { re: /gasolina|combustible|fuel|parking/, id: "fuel" },
    { re: /uber|taxi|transporte|transp|bus|metro|tren/, id: "transport" },
    { re: /viaje|vacacion|avion|vuelo|hotel/, id: "travel" },
    { re: /hogar|casa|home|alquiler|renta|hipoteca/, id: "home" },
    { re: /luz|energia|electric/, id: "energy" },
    { re: /agua|water/, id: "water" },
    { re: /internet|wifi|fibra/, id: "wifi" },
    { re: /telefono|móvil|movil|phone|celular/, id: "phone" },
    { re: /salud|medico|médico|farmacia|doctor|hospital/, id: "health" },
    { re: /gym|gimnasio|deporte/, id: "gym" },
    { re: /ropa|moda|clothes/, id: "clothes" },
    { re: /cine|netflix|ocio|entreten/, id: "cinema" },
    { re: /juego|game|playstation|xbox/, id: "game" },
    { re: /musica|spotify|music/, id: "music" },
    { re: /educaci|edu|curso|universidad|colegio/, id: "edu" },
    { re: /regalo|gift/, id: "gifts" },
    { re: /mascota|perro|gato|pet/, id: "pets" },
    { re: /bebe|bebé|niñ|kids|hijo/, id: "kids" },
    { re: /trabajo|oficina|work/, id: "work" },
    { re: /fiesta|party|cumple/, id: "party" },
    { re: /belleza|peluquer|spa/, id: "beauty" },
    { re: /libro|book/, id: "books" },
    { re: /bici|bike/, id: "bike" },
    { re: /lujo|luxury/, id: "luxury" },
    { re: /ahorro|saving/, id: "misc" },
    { re: /fijo|fixed/, id: "home" },
  ];

  for (const rule of rules) {
    if (rule.re.test(raw)) return rule.id;
  }
  return "misc";
}
