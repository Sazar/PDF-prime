const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { PDFDocument, rgb } = require('pdf-lib');
const QRCode = require('qrcode');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuration des dossiers
const UPLOAD_DIR = path.join(__dirname, 'uploads');
const DOWNLOAD_DIR = path.join(__dirname, 'downloads');

// Création des dossiers s'ils n'existent pas
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
if (!fs.existsSync(DOWNLOAD_DIR)) fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });

// Configuration de multer pour l'upload
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, UPLOAD_DIR);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 50 * 1024 * 1024 } // Limite 50MB
});

// Middleware
app.use(express.static('.'));
app.use(express.json());

// Route principale
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// ==================== OUTILS PDF ====================

// 1. FUSIONNER DES PDF
app.post('/api/merge', upload.array('files', 10), async (req, res) => {
    try {
        if (!req.files || req.files.length < 2) {
            return res.status(400).json({ error: 'Au moins 2 fichiers requis' });
        }

        const mergedPdf = await PDFDocument.create();
        
        for (const file of req.files) {
            const pdfBytes = fs.readFileSync(file.path);
            const pdf = await PDFDocument.load(pdfBytes);
            const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
            copiedPages.forEach((page) => mergedPdf.addPage(page));
        }

        const mergedBytes = await mergedPdf.save();
        const outputFilename = `merged-${Date.now()}.pdf`;
        const outputPath = path.join(DOWNLOAD_DIR, outputFilename);
        
        fs.writeFileSync(outputPath, mergedBytes);
        
        // Nettoyage des fichiers uploadés
        req.files.forEach(file => fs.unlinkSync(file.path));
        
        res.json({ 
            success: true, 
            filename: outputFilename,
            message: 'PDF fusionné avec succès'
        });
    } catch (error) {
        console.error('Erreur fusion:', error);
        res.status(500).json({ error: 'Erreur lors de la fusion' });
    }
});

// 2. DIVISER UN PDF
app.post('/api/split', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Aucun fichier fourni' });
        }

        const pdfBytes = fs.readFileSync(req.file.path);
        const pdfDoc = await PDFDocument.load(pdfBytes);
        const totalPages = pdfDoc.getPageCount();
        const outputFiles = [];

        // Division : une page par fichier
        for (let i = 0; i < totalPages; i++) {
            const newPdf = await PDFDocument.create();
            const [copiedPage] = await newPdf.copyPages(pdfDoc, [i]);
            newPdf.addPage(copiedPage);
            
            const pdfBytes = await newPdf.save();
            const filename = `split-page-${i+1}-${Date.now()}.pdf`;
            const outputPath = path.join(DOWNLOAD_DIR, filename);
            
            fs.writeFileSync(outputPath, pdfBytes);
            outputFiles.push(filename);
        }

        fs.unlinkSync(req.file.path);
        
        res.json({ 
            success: true, 
            files: outputFiles,
            message: `PDF divisé en ${totalPages} pages`
        });
    } catch (error) {
        console.error('Erreur division:', error);
        res.status(500).json({ error: 'Erreur lors de la division' });
    }
});

// 3. COMPRESSER UN PDF (version basique - supprime les métadonnées)
app.post('/api/compress', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Aucun fichier fourni' });
        }

        const pdfBytes = fs.readFileSync(req.file.path);
        const pdfDoc = await PDFDocument.load(pdfBytes);
        
        // Compression basique : sauvegarde sans métadonnées inutiles
        const compressedBytes = await pdfDoc.save({
            useObjectStreams: false,
        });
        
        const originalSize = fs.statSync(req.file.path).size;
        const compressedSize = compressedBytes.length;
        const reduction = ((originalSize - compressedSize) / originalSize * 100).toFixed(2);
        
        const filename = `compressed-${Date.now()}.pdf`;
        const outputPath = path.join(DOWNLOAD_DIR, filename);
        fs.writeFileSync(outputPath, compressedBytes);
        
        fs.unlinkSync(req.file.path);
        
        res.json({ 
            success: true, 
            filename: filename,
            originalSize: originalSize,
            compressedSize: compressedSize,
            reduction: reduction + '%',
            message: 'PDF compressé avec succès'
        });
    } catch (error) {
        console.error('Erreur compression:', error);
        res.status(500).json({ error: 'Erreur lors de la compression' });
    }
});

// 4. AJOUTER UN FILIGRANE (WATERMARK)
app.post('/api/watermark', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Aucun fichier fourni' });
        }

        const text = req.body.text || 'CONFIDENTIEL';
        const pdfBytes = fs.readFileSync(req.file.path);
        const pdfDoc = await PDFDocument.load(pdfBytes);
        const pages = pdfDoc.getPages();

        pages.forEach(page => {
            const { width, height } = page.getSize();
            page.drawText(text, {
                x: width / 2 - 100,
                y: height / 2,
                size: 50,
                color: rgb(0.5, 0.5, 0.5),
                opacity: 0.3,
                rotate: { type: 'degrees', angle: 45 },
            });
        });

        const modifiedBytes = await pdfDoc.save();
        const filename = `watermarked-${Date.now()}.pdf`;
        const outputPath = path.join(DOWNLOAD_DIR, filename);
        fs.writeFileSync(outputPath, modifiedBytes);
        
        fs.unlinkSync(req.file.path);
        
        res.json({ 
            success: true, 
            filename: filename,
            message: 'Filigrane ajouté avec succès'
        });
    } catch (error) {
        console.error('Erreur filigrane:', error);
        res.status(500).json({ error: 'Erreur lors de l\'ajout du filigrane' });
    }
});

// 5. PROTÉGER UN PDF AVEC MOT DE PASSE
app.post('/api/protect', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Aucun fichier fourni' });
        }

        const password = req.body.password || 'password123';
        const pdfBytes = fs.readFileSync(req.file.path);
        const pdfDoc = await PDFDocument.load(pdfBytes);
        
        const protectedBytes = await pdfDoc.save({
            userPassword: password,
            ownerPassword: password + '_owner',
        });
        
        const filename = `protected-${Date.now()}.pdf`;
        const outputPath = path.join(DOWNLOAD_DIR, filename);
        fs.writeFileSync(outputPath, protectedBytes);
        
        fs.unlinkSync(req.file.path);
        
        res.json({ 
            success: true, 
            filename: filename,
            message: 'PDF protégé avec succès'
        });
    } catch (error) {
        console.error('Erreur protection:', error);
        res.status(500).json({ error: 'Erreur lors de la protection' });
    }
});

// 6. ROTATION DE PAGES
app.post('/api/rotate', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Aucun fichier fourni' });
        }

        const degrees = parseInt(req.body.degrees) || 90;
        const pdfBytes = fs.readFileSync(req.file.path);
        const pdfDoc = await PDFDocument.load(pdfBytes);
        const pages = pdfDoc.getPages();

        pages.forEach(page => {
            const currentRotation = page.getRotation().angle;
            page.setRotation({ type: 'degrees', angle: currentRotation + degrees });
        });

        const rotatedBytes = await pdfDoc.save();
        const filename = `rotated-${Date.now()}.pdf`;
        const outputPath = path.join(DOWNLOAD_DIR, filename);
        fs.writeFileSync(outputPath, rotatedBytes);
        
        fs.unlinkSync(req.file.path);
        
        res.json({ 
            success: true, 
            filename: filename,
            message: `PDF tourné de ${degrees}°`
        });
    } catch (error) {
        console.error('Erreur rotation:', error);
        res.status(500).json({ error: 'Erreur lors de la rotation' });
    }
});

// 7. GÉNÉRER UN QR CODE VERS UN PDF
app.post('/api/qrcode', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Aucun fichier fourni' });
        }

        const baseUrl = req.protocol + '://' + req.get('host');
        const fileUrl = `${baseUrl}/downloads/${req.file.filename}`;
        
        const qrCodeDataUrl = await QRCode.toDataURL(fileUrl);
        
        fs.unlinkSync(req.file.path);
        
        res.json({ 
            success: true, 
            qrCode: qrCodeDataUrl,
            message: 'QR Code généré avec succès'
        });
    } catch (error) {
        console.error('Erreur QR Code:', error);
        res.status(500).json({ error: 'Erreur lors de la génération du QR Code' });
    }
});

// 8. TÉLÉCHARGER UN FICHIER TRAITÉ
app.get('/download/:filename', (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(DOWNLOAD_DIR, filename);
    
    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'Fichier non trouvé' });
    }
    
    res.download(filePath, filename);
});

// 9. SUPPRIMER LES ANCIENS FICHIERS (nettoyage automatique)
setInterval(() => {
    const now = Date.now();
    const maxAge = 3600000; // 1 heure
    
    [UPLOAD_DIR, DOWNLOAD_DIR].forEach(dir => {
        fs.readdir(dir, (err, files) => {
            if (err) return;
            files.forEach(file => {
                const filePath = path.join(dir, file);
                fs.stat(filePath, (err, stats) => {
                    if (err) return;
                    if (now - stats.mtimeMs > maxAge) {
                        fs.unlink(filePath, () => {});
                    }
                });
            });
        });
    });
}, 3600000);

// Démarrage du serveur
app.listen(PORT, () => {
    console.log(`🚀 Serveur PDF Tools démarré sur http://localhost:${PORT}`);
    console.log(`📁 Dossier d'upload: ${UPLOAD_DIR}`);
    console.log(`📥 Dossier de téléchargement: ${DOWNLOAD_DIR}`);
});
