require('dotenv').config();
const express = require('express');
const admin = require('firebase-admin');
const path = require('path');

const app = express();
app.use(express.json());

// Inisialisasi Firestore menggunakan Environment Variables
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      // Mengubah string \n menjadi newlines yang valid pada private key
      privateKey: process.env.FIREBASE_PRIVATE_KEY
        ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
        : undefined,
    }),
  });
}

const db = admin.firestore();
const booksCollection = db.collection('books');

// Serve static files dari folder public (untuk lokal dev)
app.use(express.static(path.join(__dirname, '../public')));

// === API ROUTES ===

// 1. Ambil semua data buku
app.get('/api/books', async (req, res) => {
  try {
    const snapshot = await booksCollection.get();
    const books = [];
    snapshot.forEach((doc) => {
      books.push({ id: doc.id, ...doc.data() });
    });
    res.status(200).json(books);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2. Tambah buku baru
app.post('/api/books', async (req, res) => {
  try {
    const { title, author, year } = req.body;
    if (!title || !author) {
      return res.status(400).json({ error: 'Judul dan Penulis wajib diisi' });
    }

    const newBook = {
      title,
      author,
      year: Number(year) || new Date().getFullYear(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const docRef = await booksCollection.add(newBook);
    res.status(201).json({ id: docRef.id, ...newBook });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 3. Hapus buku berdasarkan ID
app.delete('/api/books/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await booksCollection.doc(id).delete();
    res.status(200).json({ message: 'Buku berhasil dihapus' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Port listener untuk pengujian lokal
const PORT = process.env.PORT || 3000;
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Server berjalan di http://localhost:${PORT}`);
  });
}

// Export Express app untuk Vercel Serverless Function
module.exports = app;