export const calcularDiasVencidos = (fechaString) => {
    if (!fechaString) return 0;
    
    let dia, mes, anio;

    // Traductor Universal: Entiende YYYY-MM-DD o DD/MM/YYYY
    if (fechaString.includes('-')) {
        [anio, mes, dia] = fechaString.split('-');
    } else if (fechaString.includes('/')) {
        [dia, mes, anio] = fechaString.split('/');
    } else {
        return 0; // Formato desconocido
    }

    const fechaVencimiento = new Date(anio, mes - 1, dia);
    
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0); // Normalizamos a la medianoche
    
    const diffTime = hoy - fechaVencimiento;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays > 0 ? diffDays : 0;
};