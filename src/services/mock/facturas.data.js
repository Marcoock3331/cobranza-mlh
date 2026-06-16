export const mockFacturas = [
    {
        id: "fac-001",
        folio: "215816sasd",
        cliente: "Dante Ivan Saucedo Luna",
        monto_total: 5000,
        saldo_pendiente: 4000,
        estatus: "Pendiente",
        emision: "2026-05-28",
        vencimiento: "2027-03-28",
        uso_cfdi: "G03",
        abonos: [
            {
                id_abono: "abn-112233",
                fecha: "29/05/2026, 10:00:00 a.m.",
                monto: 1000,
                metodo: "Efectivo",
                registrado_por: "Admin",
                saldo_anterior: 5000,
                saldo_restante: 4000
            }
        ]
    }
];