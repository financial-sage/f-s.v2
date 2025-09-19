export default function BudgetPage() {
    return (
        <div>
            <h1 className="text-2xl font-bold    dark:text-white" style={{ fontWeight: "200" }}>Presupuesto!</h1>
            <p className="dark:text-zinc-400">Aquí puedes gestionar y visualizar tu presupuesto.</p>
            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-2 gap-3 mt-4">
                {/* Contenido del presupuesto */}
                <div className="card sm h-full">
                    <div className="cardHeader">
                        <h3 className="cardTitle">Presupuesto Mensual</h3>
                        <p className="cardSubtitle">Resumen de tu presupuesto mensual.</p>
                    </div>
                    <div className="cardContent">
                       <ul>
                        <li className="mb-2">
                             <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                    <span className="mr-2 text-2xl">🏠</span> {/* Icono de ejemplo */}
                                    <div>
                                        <p className="font-semibold">Vivienda</p>
                                        <p className="text-sm text-zinc-500 dark:text-zinc-400">Gastado: $300 de $1000</p>
                                    </div>
                                </div>
                                <div className="w-1/2 bg-gray-200 rounded-full h-1 dark:bg-gray-700">
                                    <div className="bg-blue-600 h-1 rounded-full" style={{ width: '30%' }}></div>
                                </div>
                            </div>

                        </li>
                       </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}
