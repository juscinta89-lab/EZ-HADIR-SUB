const functions = require("firebase-functions/v1");
const admin = require("firebase-admin");
admin.initializeApp();

exports.ujiNotifikasi = functions.region("asia-southeast1").https.onCall(
    async (data, context) => {
      // 1. Pastikan pengguna log masuk
      if (!context.auth) {
        throw new functions.https.HttpsError(
            "unauthenticated",
            "Sila log masuk.",
        );
      }
      const sid = data.sid;
      if (!sid) {
        throw new functions.https.HttpsError(
            "invalid-argument",
            "ID Sekolah diperlukan.",
        );
      }

      try {
        // 2. Dapatkan senarai token untuk sekolah ini
        const tokenSnap = await admin.firestore()
            .collection("sekolah")
            .doc(sid)
            .collection("token")
            .get();

        if (tokenSnap.empty) {
          return {dihantar: 0, ralat: "Tiada peranti berdaftar."};
        }

        const tokens = [];
        tokenSnap.forEach((doc) => tokens.push(doc.data().token));

        // 3. Hantar Notifikasi Multicast
        const mesej = {
          notification: {
            title: "Ujian Notifikasi EZ-HADIR",
            body: "Sistem notifikasi Cloud Messaging berfungsi!",
          },
          tokens: tokens,
        };

        // KEMAS KINI DI SINI: Guna sendEachForMulticast
        const respons = await admin.messaging().sendEachForMulticast(mesej);

        // 4. Bersihkan token yang tidak sah (expired)
        if (respons.failureCount > 0) {
          const batch = admin.firestore().batch();
          respons.responses.forEach((res, idx) => {
            if (!res.success) {
              batch.delete(tokenSnap.docs[idx].ref);
            }
          });
          await batch.commit();
        }

        return {dihantar: respons.successCount};
      } catch (e) {
        throw new functions.https.HttpsError(
            "internal",
            "Gagal hantar notifikasi: " + e.message,
        );
      }
    },
);
