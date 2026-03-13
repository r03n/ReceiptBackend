const app = {
    currentView: 'all', // 'all', 'latest', 'detail'
    socket: null,

    init() {
        this.socket = io();
        this.socket.on('new-receipt', (data) => {
            console.log("New receipt detected:", data.id);
            // Refresh current view when a new receipt arrives
            if (this.currentView === 'all') {
                this.loadAllReceipts();
            } else if (this.currentView === 'latest') {
                this.loadLatestReceipt();
            }
        });

        // Initialize view based on URL hash or default to 'all'
        window.addEventListener('hashchange', () => this.handleRoute());
        this.handleRoute();
    },

    formatDate(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    },

    setActiveTab(tabId) {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        if (tabId) {
            document.getElementById(tabId).classList.add('active');
        }
    },

    handleRoute() {
        const hash = window.location.hash;
        if (hash === '#latest') {
            this.showLatestReceipt();
        } else if (hash.startsWith('#receipt/')) {
            const id = hash.split('/')[1];
            this.showReceiptDetail(id);
        } else {
            this.showAllReceipts();
        }
    },

    async fetchAPI(url) {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error("API Fetch Error:", error);
            this.renderEmptyState('Error', 'Failed to load data. ' + error.message);
            return null;
        }
    },

    async loadAllReceipts() {
        const receipts = await this.fetchAPI('/api/receipts');
        if (!receipts) return;

        const container = document.getElementById('container');
        container.innerHTML = ''; // Clear container

        if (receipts.length === 0) {
            this.renderEmptyState('No Receipts Yet', 'Send ESC/POS data to port 9100 to generate your first receipt.');
            return;
        }

        const template = document.getElementById('tpl-homepage').content.cloneNode(true);
        const grid = template.getElementById('receipts-grid');
        const cardTemplate = document.getElementById('tpl-receipt-card').innerHTML;

        receipts.forEach(receipt => {
            const date = this.formatDate(receipt.created_at);
            let cardHtml = cardTemplate
                .replace(/{{ID}}/g, receipt.id)
                .replace('{{SHORT_ID}}', receipt.id.substring(0, 8) + '...')
                .replace('{{DATE}}', date);
            
            // Create a temporary element to hold the HTML and append it
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = cardHtml.trim();
            grid.appendChild(tempDiv.firstChild);
        });

        container.appendChild(template);
    },

    async loadLatestReceipt() {
        const receipt = await this.fetchAPI('/api/receipts/latest');
        if (!receipt) return;

        if (receipt.empty) {
            this.renderEmptyState('No Receipts Yet', 'Send ESC/POS data to port 9100 to generate your first receipt.');
            return;
        }
        
        this.renderDetailView(receipt, 'Latest Receipt', '#', 'View All Receipts');
    },

    async loadReceiptDetail(id) {
        const receipt = await this.fetchAPI(`/api/receipts/${id}`);
        if (!receipt) return;
        
        if (receipt.error) {
            this.renderEmptyState('Receipt Not Found', 'The requested receipt does not exist.', '<a href="#" class="btn-back" onclick="app.goBack(event)">← Return to List</a>');
            return;
        }

        this.renderDetailView(receipt, 'Receipt Details', '#', 'Back to All Receipts');
    },

    renderDetailView(receipt, title, backUrl, backText) {
        const container = document.getElementById('container');
        const templateHtml = document.getElementById('tpl-receipt-detail').innerHTML;
        const date = this.formatDate(receipt.created_at);

        const html = templateHtml
            .replace(/{{TITLE}}/g, title)
            .replace(/{{ID}}/g, receipt.id)
            .replace(/{{DATE}}/g, date)
            .replace(/{{BACK_TEXT}}/g, backText);

        container.innerHTML = html;
        
        // Update back button behavior since we're using hash routing
        const backBtn = container.querySelector('.btn-back');
        if(backBtn) {
           backBtn.onclick = (e) => this.goBack(e);
        }
    },

    renderEmptyState(title, description, extraHtml = '') {
        const container = document.getElementById('container');
        const templateHtml = document.getElementById('tpl-empty-state').innerHTML;
        
        const html = templateHtml
            .replace('{{TITLE}}', title)
            .replace('{{DESCRIPTION}}', description);

        container.innerHTML = html;
        
        if (extraHtml) {
             const extraDiv = container.querySelector('#empty-extra');
             if(extraDiv) extraDiv.innerHTML = extraHtml;
        }
    },

    // Navigation triggers
    showAllReceipts(event) {
        if(event) event.preventDefault();
        this.currentView = 'all';
        this.setActiveTab('tab-all');
        window.location.hash = ''; // Clear hash for 'all'
        this.loadAllReceipts();
        document.title = "All Receipts - Receipt Dashboard";
    },

    showLatestReceipt(event) {
        if(event) event.preventDefault();
        this.currentView = 'latest';
        this.setActiveTab('tab-latest');
        window.location.hash = 'latest';
        this.loadLatestReceipt();
        document.title = "Latest Receipt - Receipt Dashboard";
    },

    showReceiptDetail(id) {
        this.currentView = 'detail';
        this.setActiveTab(''); // No active tab for detail view
        window.location.hash = `receipt/${id}`;
        this.loadReceiptDetail(id);
        document.title = "Receipt Details - Receipt Dashboard";
    },

    goBack(event) {
        if(event) event.preventDefault();
        // Simple back logic: if we were just looking at latest, go to latest. Otherwise, go to all.
        // For a more robust app, you'd track history.
        if (window.location.hash === '#latest') {
            this.showLatestReceipt();
        } else {
            this.showAllReceipts();
        }
    }
};

// Start the app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    app.init();
});
