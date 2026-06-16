import { db } from '../config/firebase';
import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';

export const auditoriaService = {
    registrarMovimiento: async (movimiento) => {
        // BLINDAJE OBLIGATORIO: Las reglas de Firestore exigen la firma del actor.
        if (!movimiento || !movimiento.actor_uid) {
            console.error("Auditoría rechazada: No se puede registrar una actividad sin el actor_uid.");
            return { success: false, error: "Identidad del usuario no verificada." };
        }

        try {
            const nuevoDocRef = doc(collection(db, 'actividad'));
            
            const payload = {
                ...movimiento,
                id: nuevoDocRef.id,
                serverTime: serverTimestamp() // Registro plano ultra-rápido
            };
            
            await setDoc(nuevoDocRef, payload);
            return { success: true, data: payload };
        } catch (error) {
            // Este log es silencioso para no interrumpir al usuario si el internet falla por un microsegundo
            console.warn("Auditoría diferida (Fallo de conexión):", error);
            return { success: false, error: error.message };
        }
    }
};