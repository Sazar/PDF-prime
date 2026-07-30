// Application JavaScript pour PDF Tools

document.addEventListener('DOMContentLoaded', function() {
    // Initialisation des variables
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    const toolCards = document.querySelectorAll('.tool-card');
    
    // Gestion de la zone d'upload
    if (uploadArea) {
        // Drag and Drop
        uploadArea.addEventListener('dragover', handleDragOver);
        uploadArea.addEventListener('dragleave', handleDragLeave);
        uploadArea.addEventListener('drop', handleDrop);
        
        // Click pour sélectionner un fichier
        uploadArea.addEventListener('click', () => fileInput.click());
        
        // Changement de fichier
        fileInput.addEventListener('change', handleFileSelect);
    }
    
    // Gestion des clics sur les outils
    toolCards.forEach(card => {
        card.addEventListener('click', function() {
            const toolType = this.getAttribute('data-tool');
            selectTool(toolType, this);
        });
    });
    
    // Gestion du formulaire de contact
    const contactForm = document.querySelector('.contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', handleContactSubmit);
    }
});

// Variables globales pour les fichiers sélectionnés
let selectedFiles = [];
let currentTool = null;
const API_BASE_URL = ''; // Utiliser le même domaine que le frontend

// Fonction pour envoyer des fichiers au backend
async function sendFilesToBackend(endpoint, files, additionalData = {}) {
    const formData = new FormData();
    
    // Ajouter les fichiers
    if (Array.isArray(files)) {
        files.forEach(file => formData.append('files', file));
    } else {
        formData.append('file', files);
    }
    
    // Ajouter les données supplémentaires
    Object.keys(additionalData).forEach(key => {
        formData.append(key, additionalData[key]);
    });
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/${endpoint}`, {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.error || 'Erreur lors du traitement');
        }
        
        return result;
    } catch (error) {
        console.error('Erreur:', error);
        throw error;
    }
}

// Fonction pour télécharger un fichier traité
function downloadFile(filename) {
    window.location.href = `${API_BASE_URL}/download/${filename}`;
}

// Gestion du drag over
function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    this.style.background = 'rgba(255, 255, 255, 0.2)';
    this.style.borderColor = '#fff';
}

// Gestion du drag leave
function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    this.style.background = 'white';
    this.style.borderColor = 'rgba(255, 255, 255, 0.5)';
}

// Gestion du drop
function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    this.style.background = 'white';
    this.style.borderColor = 'rgba(255, 255, 255, 0.5)';
    
    const files = e.dataTransfer.files;
    handleFiles(files);
}

// Gestion de la sélection de fichier
function handleFileSelect(e) {
    const files = e.target.files;
    handleFiles(files);
}

// Traitement des fichiers
function handleFiles(files) {
    const pdfFiles = Array.from(files).filter(file => file.type === 'application/pdf');
    
    if (pdfFiles.length === 0) {
        alert('Veuillez sélectionner des fichiers PDF valides.');
        return;
    }
    
    selectedFiles = pdfFiles;
    
    // Afficher les informations sur les fichiers sélectionnés
    showFileInfo(pdfFiles);
}

// Affichage des informations sur les fichiers
function showFileInfo(files) {
    const uploadArea = document.getElementById('uploadArea');
    let fileInfoHTML = '<div class="file-info">';
    fileInfoHTML += '<h4>Fichiers sélectionnés :</h4>';
    
    files.forEach((file, index) => {
        const fileSize = (file.size / 1024 / 1024).toFixed(2);
        fileInfoHTML += `
            <div class="file-item">
                <i class="fas fa-file-pdf"></i>
                <span>${file.name}</span>
                <span class="file-size">${fileSize} MB</span>
                <button class="remove-file" data-index="${index}">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
    });
    
    fileInfoHTML += '</div>';
    fileInfoHTML += '<button class="process-btn" onclick="processFiles()">Traiter les fichiers</button>';
    
    uploadArea.innerHTML = fileInfoHTML;
    
    // Ajouter les gestionnaires d'événements pour supprimer les fichiers
    document.querySelectorAll('.remove-file').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const index = parseInt(this.getAttribute('data-index'));
            removeFile(index);
        });
    });
}

// Supprimer un fichier de la sélection
function removeFile(index) {
    selectedFiles.splice(index, 1);
    
    if (selectedFiles.length > 0) {
        showFileInfo(selectedFiles);
    } else {
        resetUploadArea();
    }
}

// Réinitialiser la zone d'upload
function resetUploadArea() {
    const uploadArea = document.getElementById('uploadArea');
    uploadArea.innerHTML = `
        <i class="fas fa-cloud-upload-alt"></i>
        <h3>Déposez votre fichier PDF ici</h3>
        <p>ou cliquez pour sélectionner un fichier</p>
        <input type="file" id="fileInput" accept=".pdf" multiple>
    `;
    
    // Réattacher les gestionnaires d'événements
    const newFileInput = document.getElementById('fileInput');
    uploadArea.addEventListener('click', () => newFileInput.click());
    newFileInput.addEventListener('change', handleFileSelect);
}

// Sélection d'un outil
function selectTool(toolType, cardElement) {
    currentTool = toolType;
    
    // Retirer la sélection précédente
    document.querySelectorAll('.tool-card').forEach(card => {
        card.classList.remove('selected');
    });
    
    // Ajouter la sélection à l'outil cliqué
    cardElement.classList.add('selected');
    
    // Messages selon l'outil
    const toolMessages = {
        'merge': 'Outil de fusion PDF sélectionné. Ajoutez plusieurs fichiers PDF à fusionner.',
        'split': 'Outil de division PDF sélectionné. Ajoutez un fichier PDF à diviser.',
        'compress': 'Outil de compression PDF sélectionné. Ajoutez un fichier PDF à compresser.',
        'pdf-to-word': 'Conversion PDF vers Word sélectionnée. Ajoutez un fichier PDF à convertir.',
        'word-to-pdf': 'Conversion Word vers PDF sélectionnée. Ajoutez un fichier Word à convertir.',
        'pdf-to-ppt': 'Conversion PDF vers PowerPoint sélectionnée. Ajoutez un fichier PDF à convertir.',
        'ppt-to-pdf': 'Conversion PowerPoint vers PDF sélectionnée. Ajoutez une présentation à convertir.',
        'pdf-to-excel': 'Conversion PDF vers Excel sélectionnée. Ajoutez un fichier PDF à convertir.',
        'excel-to-pdf': 'Conversion Excel vers PDF sélectionnée. Ajoutez un fichier Excel à convertir.',
        'pdf-to-jpg': 'Conversion PDF vers JPG sélectionnée. Ajoutez un fichier PDF à convertir.',
        'jpg-to-pdf': 'Conversion JPG vers PDF sélectionnée. Ajoutez des images JPG à convertir.',
        'edit': 'Éditeur PDF sélectionné. Ajoutez un fichier PDF à modifier.',
        'sign': 'Outil de signature PDF sélectionné. Ajoutez un fichier PDF à signer.',
        'protect': 'Protection PDF sélectionnée. Ajoutez un fichier PDF à protéger par mot de passe.',
        'unlock': 'Déverrouillage PDF sélectionné. Ajoutez un fichier PDF protégé.',
        'rotate': 'Rotation PDF sélectionnée. Ajoutez un fichier PDF à faire pivoter.',
        'page-numbers': 'Numérotation des pages sélectionnée. Ajoutez un fichier PDF.',
        'repair': 'Réparation PDF sélectionnée. Ajoutez un fichier PDF corrompu.',
        'compare': 'Comparaison PDF sélectionnée. Ajoutez deux fichiers PDF à comparer.',
        'html-to-pdf': 'Conversion HTML vers PDF sélectionnée.'
    };
    
    const message = toolMessages[toolType] || 'Outil sélectionné.';
    
    // Afficher une notification
    showNotification(message, 'info');
    
    // Faire défiler jusqu'à la zone d'upload
    document.querySelector('.hero').scrollIntoView({ behavior: 'smooth' });
}

// Traiter les fichiers
async function processFiles() {
    if (selectedFiles.length === 0) {
        showNotification('Veuillez sélectionner au moins un fichier.', 'error');
        return;
    }
    
    if (!currentTool) {
        showNotification('Veuillez sélectionner un outil à utiliser.', 'error');
        return;
    }
    
    // Afficher le chargement
    showNotification('Traitement en cours...', 'info');
    
    try {
        let endpoint = currentTool;
        let additionalData = {};
        
        // Mapping des outils vers les endpoints API
        const toolMapping = {
            'merge': 'merge',
            'split': 'split',
            'compress': 'compress',
            'watermark': 'watermark',
            'protect': 'protect',
            'rotate': 'rotate',
            'qrcode': 'qrcode'
        };
        
        endpoint = toolMapping[currentTool];
        
        if (!endpoint) {
            showNotification('Outil non disponible pour le moment. Fonctionnalité en développement.', 'info');
            simulateDownload();
            return;
        }
        
        // Données supplémentaires selon l'outil
        if (currentTool === 'protect') {
            const password = prompt('Entrez un mot de passe pour protéger le PDF:');
            if (!password) {
                showNotification('Mot de passe requis.', 'error');
                return;
            }
            additionalData.password = password;
        }
        
        if (currentTool === 'watermark') {
            const text = prompt('Entrez le texte du filigrane (par défaut: CONFIDENTIEL):') || 'CONFIDENTIEL';
            additionalData.text = text;
        }
        
        if (currentTool === 'rotate') {
            const degrees = prompt('Angle de rotation (90, 180, 270):', '90') || '90';
            additionalData.degrees = degrees;
        }
        
        // Appel au backend
        const result = await sendFilesToBackend(endpoint, selectedFiles, additionalData);
        
        if (result.success) {
            showNotification(result.message, 'success');
            
            // Télécharger le(s) fichier(s) traité(s)
            if (result.filename) {
                downloadFile(result.filename);
            } else if (result.files && result.files.length > 0) {
                // Plusieurs fichiers (pour split par exemple)
                result.files.forEach(filename => {
                    setTimeout(() => downloadFile(filename), 100);
                });
            }
            
            // Réinitialiser l'interface
            resetUploadArea();
            selectedFiles = [];
            currentTool = null;
            document.querySelectorAll('.tool-card').forEach(card => card.classList.remove('selected'));
        }
    } catch (error) {
        console.error('Erreur de traitement:', error);
        showNotification('Erreur lors du traitement: ' + error.message, 'error');
    }
}

// Simulation de téléchargement
function simulateDownload() {
    // Créer un lien de téléchargement fictif
    const link = document.createElement('a');
    link.href = '#';
    link.download = 'processed-file.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Gestion du formulaire de contact
function handleContactSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const name = formData.get('Votre nom') || e.target[0].value;
    const email = formData.get('Votre email') || e.target[1].value;
    const message = formData.get('Votre message') || e.target[2].value;
    
    // Validation simple
    if (!name || !email || !message) {
        showNotification('Veuillez remplir tous les champs.', 'error');
        return;
    }
    
    // Simulation d'envoi
    showNotification('Message envoyé avec succès ! Nous vous répondrons bientôt.', 'success');
    e.target.reset();
}

// Afficher une notification
function showNotification(message, type = 'info') {
    // Créer l'élément de notification
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <i class="fas fa-${getIconForType(type)}"></i>
        <span>${message}</span>
        <button class="close-notification">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    // Styles de la notification
    notification.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        background: ${getBackgroundColorForType(type)};
        color: white;
        padding: 15px 20px;
        border-radius: 5px;
        box-shadow: 0 5px 15px rgba(0,0,0,0.3);
        z-index: 9999;
        display: flex;
        align-items: center;
        gap: 10px;
        animation: slideIn 0.3s ease forwards;
    `;
    
    document.body.appendChild(notification);
    
    // Bouton de fermeture
    const closeBtn = notification.querySelector('.close-notification');
    closeBtn.style.cssText = `
        background: none;
        border: none;
        color: white;
        cursor: pointer;
        font-size: 1rem;
        margin-left: 10px;
    `;
    closeBtn.addEventListener('click', () => {
        notification.remove();
    });
    
    // Auto-disparition après 5 secondes
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.animation = 'slideOut 0.3s ease forwards';
            setTimeout(() => notification.remove(), 300);
        }
    }, 5000);
}

// Obtenir l'icône selon le type
function getIconForType(type) {
    const icons = {
        'success': 'check-circle',
        'error': 'exclamation-circle',
        'info': 'info-circle',
        'warning': 'exclamation-triangle'
    };
    return icons[type] || 'info-circle';
}

// Obtenir la couleur de fond selon le type
function getBackgroundColorForType(type) {
    const colors = {
        'success': '#27ae60',
        'error': '#e74c3c',
        'info': '#3498db',
        'warning': '#f39c12'
    };
    return colors[type] || '#3498db';
}

// Ajouter les animations CSS pour les notifications
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
    
    .tool-card.selected {
        border-color: #e74c3c;
        background: #fff;
        box-shadow: 0 10px 30px rgba(231, 76, 60, 0.2);
    }
    
    .file-info {
        text-align: left;
        width: 100%;
    }
    
    .file-info h4 {
        margin-bottom: 15px;
        color: #333;
    }
    
    .file-item {
        display: flex;
        align-items: center;
        padding: 10px;
        background: #f8f9fa;
        border-radius: 5px;
        margin-bottom: 10px;
    }
    
    .file-item i {
        color: #e74c3c;
        margin-right: 10px;
        font-size: 1.2rem;
    }
    
    .file-item span {
        flex: 1;
        margin-right: 10px;
    }
    
    .file-item .file-size {
        color: #666;
        font-size: 0.9rem;
    }
    
    .file-item .remove-file {
        background: #e74c3c;
        color: white;
        border: none;
        border-radius: 50%;
        width: 25px;
        height: 25px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
    }
    
    .file-item .remove-file:hover {
        background: #c0392b;
    }
    
    .process-btn {
        background: #e74c3c;
        color: white;
        border: none;
        padding: 12px 30px;
        border-radius: 5px;
        font-size: 1rem;
        cursor: pointer;
        margin-top: 15px;
        transition: background 0.3s ease;
    }
    
    .process-btn:hover {
        background: #c0392b;
    }
`;
document.head.appendChild(style);

// Fonction utilitaire pour gérer les différentes opérations PDF
class PDFProcessor {
    constructor() {
        this.supportedOperations = [
            'merge', 'split', 'compress', 'convert', 
            'edit', 'sign', 'protect', 'unlock', 
            'rotate', 'addPageNumbers', 'repair', 'compare'
        ];
    }
    
    async merge(files) {
        console.log('Fusion des fichiers:', files);
        // Implémentation backend requise
        return await this.sendToBackend('merge', files);
    }
    
    async split(file, options) {
        console.log('Division du fichier:', file, options);
        // Implémentation backend requise
        return await this.sendToBackend('split', file, options);
    }
    
    async compress(file, level = 'medium') {
        console.log('Compression du fichier:', file, 'Niveau:', level);
        // Implémentation backend requise
        return await this.sendToBackend('compress', file, { level });
    }
    
    async convert(file, fromFormat, toFormat) {
        console.log(`Conversion de ${fromFormat} vers ${toFormat}:`, file);
        // Implémentation backend requise
        return await this.sendToBackend('convert', file, { fromFormat, toFormat });
    }
    
    async sendToBackend(operation, files, options = {}) {
        // Cette fonction enverra les fichiers au backend pour traitement
        // À implémenter avec un serveur backend (Node.js, Python, PHP, etc.)
        
        const formData = new FormData();
        formData.append('operation', operation);
        
        if (Array.isArray(files)) {
            files.forEach((file, index) => {
                formData.append(`file_${index}`, file);
            });
        } else {
            formData.append('file', files);
        }
        
        formData.append('options', JSON.stringify(options));
        
        // Exemple de requête fetch (à adapter selon votre backend)
        /*
        try {
            const response = await fetch('/api/process', {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                throw new Error('Erreur lors du traitement');
            }
            
            const result = await response.json();
            return result;
        } catch (error) {
            console.error('Erreur:', error);
            throw error;
        }
        */
        
        return { success: true, message: 'Opération simulée réussie' };
    }
}

// Exporter pour utilisation globale
window.PDFProcessor = PDFProcessor;
window.processFiles = processFiles;

console.log('PDF Tools - Application initialisée avec succès!');
