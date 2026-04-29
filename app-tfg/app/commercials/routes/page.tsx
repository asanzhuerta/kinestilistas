import H1Title from "@/app/components/H1Title";
import RouteMapCard from "@/app/components/RouteMapCard";

export default function CommercialRoutesPage() {
	return (
		<div className="space-y-6">
			<H1Title
				title="Ruta del dia"
				subtitle="Consulta el recorrido previsto, los tiempos estimados y el margen operativo restante."
			/>

			<RouteMapCard
				title="Previsualizacion completa"
				subtitle="La planificacion combina visitas de hoy, geolocalizacion disponible y configuracion operativa del comercial."
			/>
		</div>
	);
}
