import PaginacionGlobal from "../ui/PaginacionGlobal";

export default function PaginacionSU({
  pagina,
  totalPaginas,
  onAnterior,
  onSiguiente,
  onCambiarPagina,
  modoCursor = false,
  hayAnterior = false,
  haySiguiente = false,
  cargando = false,
  etiqueta = "registros",
  etiquetaTotal,
  etiquetaPagina,
  totalRegistros = 0,
  registrosPorPagina = 0,
  registrosEnPagina = 0,
  scrollTargetRef,
  scrollTargetId,
  className = "",
}) {
  return (
    <PaginacionGlobal
      pagina={pagina}
      totalPaginas={totalPaginas}
      totalRegistros={totalRegistros}
      registrosPorPagina={registrosPorPagina}
      registrosEnPagina={registrosEnPagina}
      modoCursor={modoCursor}
      hayAnterior={hayAnterior}
      haySiguiente={haySiguiente}
      cargando={cargando}
      etiquetaTotal={etiquetaTotal || etiqueta}
      etiquetaPagina={etiquetaPagina || etiqueta}
      scrollTargetRef={scrollTargetRef}
      scrollTargetId={scrollTargetId}
      onAnterior={onAnterior}
      onSiguiente={onSiguiente}
      onCambiarPagina={onCambiarPagina}
      className={className}
    />
  );
}
