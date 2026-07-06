import { ChevronLeft, ChevronRight } from "lucide-react";

const obtenerNumeroSeguro = (valor, respaldo = 0) => {
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : respaldo;
};

const obtenerContenedorConScroll = (elemento) => {
  let actual = elemento?.parentElement || null;

  while (actual) {
    const estilos = window.getComputedStyle(actual);
    const overflowY = estilos.overflowY;

    if (
      ["auto", "scroll"].includes(overflowY) &&
      actual.scrollHeight > actual.clientHeight
    ) {
      return actual;
    }

    actual = actual.parentElement;
  }

  return document.scrollingElement || document.documentElement;
};

const ejecutarScroll = ({ scrollTargetRef, scrollTargetId }) => {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return;
  }

  const desplazar = () => {
    const destino =
      scrollTargetRef?.current ||
      (scrollTargetId ? document.getElementById(scrollTargetId) : null);

    if (!destino) return;

    const contenedor = obtenerContenedorConScroll(destino);

    if (typeof destino.scrollTo === "function") {
      destino.scrollTo({
        top: 0,
        left: 0,
        behavior: "smooth",
      });
    }

    if (contenedor && contenedor !== destino) {
      const destinoRect = destino.getBoundingClientRect();
      const contenedorRect = contenedor.getBoundingClientRect();
      const offset = destinoRect.top - contenedorRect.top + contenedor.scrollTop - 12;

      contenedor.scrollTo({
        top: Math.max(0, offset),
        behavior: "smooth",
      });
    } else if (typeof destino.scrollIntoView === "function") {
      destino.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  };

  window.requestAnimationFrame(() => {
    desplazar();
    window.setTimeout(desplazar, 80);
  });
};

export default function PaginacionGlobal({
  pagina = 1,
  totalPaginas = 1,
  totalRegistros = 0,
  registrosPorPagina = 0,
  registrosEnPagina = 0,
  indiceInicial,
  indiceFinal,
  modoCursor = false,
  hayAnterior = false,
  haySiguiente = false,
  cargando = false,
  etiquetaTotal = "registros",
  etiquetaPagina = "registros por página",
  textoMostrando = "",
  mostrarSiempre = false,
  scrollTargetRef,
  scrollTargetId,
  onAnterior,
  onSiguiente,
  onCambiarPagina,
  className = "",
}) {
  const paginaActual = Math.max(1, obtenerNumeroSeguro(pagina, 1));
  const totalPaginasSeguro = Math.max(1, obtenerNumeroSeguro(totalPaginas, 1));
  const totalRegistrosSeguro = Math.max(0, obtenerNumeroSeguro(totalRegistros, 0));
  const registrosPorPaginaSeguro = Math.max(
    0,
    obtenerNumeroSeguro(registrosPorPagina, 0),
  );
  const registrosEnPaginaSeguro = Math.max(
    0,
    obtenerNumeroSeguro(registrosEnPagina, 0),
  );

  const anteriorDeshabilitado = modoCursor
    ? !hayAnterior
    : paginaActual <= 1;

  const siguienteDeshabilitado = modoCursor
    ? !haySiguiente
    : paginaActual >= totalPaginasSeguro;

  const puedePaginar = modoCursor
    ? hayAnterior || haySiguiente || mostrarSiempre
    : totalRegistrosSeguro > 0 && (totalPaginasSeguro > 1 || mostrarSiempre);

  if (!puedePaginar) return null;

  const desde = modoCursor
    ? null
    : Math.max(
        1,
        obtenerNumeroSeguro(
          indiceInicial,
          (paginaActual - 1) * registrosPorPaginaSeguro + 1,
        ),
      );

  const hasta = modoCursor
    ? null
    : Math.min(
        totalRegistrosSeguro,
        obtenerNumeroSeguro(
          indiceFinal,
          desde + Math.max(0, registrosEnPaginaSeguro || registrosPorPaginaSeguro) - 1,
        ),
      );

  const textoInformativo =
    textoMostrando ||
    (modoCursor
      ? cargando
        ? "Consultando registros..."
        : registrosEnPaginaSeguro > 0
          ? `Mostrando ${registrosEnPaginaSeguro} ${etiquetaTotal} en esta página`
          : etiquetaPagina
      : `Mostrando ${desde}–${hasta} de ${totalRegistrosSeguro}`);

  const irAnterior = () => {
    if (anteriorDeshabilitado || cargando) return;

    if (modoCursor) {
      onAnterior?.();
    } else {
      onCambiarPagina?.(Math.max(1, paginaActual - 1));
    }

    ejecutarScroll({ scrollTargetRef, scrollTargetId });
  };

  const irSiguiente = () => {
    if (siguienteDeshabilitado || cargando) return;

    if (modoCursor) {
      onSiguiente?.();
    } else {
      onCambiarPagina?.(Math.min(totalPaginasSeguro, paginaActual + 1));
    }

    ejecutarScroll({ scrollTargetRef, scrollTargetId });
  };

  return (
    <div
      className={`mt-3 rounded-xl border border-gray-100 bg-white px-3 py-2.5 shadow-sm ${className}`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-center text-[10px] font-medium text-gray-500 sm:text-left md:text-xs">
          {textoInformativo}
        </p>

        <div className="flex items-center justify-between gap-2 sm:justify-end">
          <button
            type="button"
            onClick={irAnterior}
            disabled={anteriorDeshabilitado || cargando}
            className="flex h-10 w-11 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition active:scale-[0.97] active:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 md:h-9 md:w-10"
            aria-label="Página anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <span className="min-w-28 text-center text-[10px] font-black text-[#0a192f] md:text-xs">
            {modoCursor ? (
              <>Página {paginaActual}</>
            ) : (
              <>
                Página {paginaActual} de {totalPaginasSeguro}
              </>
            )}
          </span>

          <button
            type="button"
            onClick={irSiguiente}
            disabled={siguienteDeshabilitado || cargando}
            className="flex h-10 w-11 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition active:scale-[0.97] active:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 md:h-9 md:w-10"
            aria-label="Página siguiente"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
