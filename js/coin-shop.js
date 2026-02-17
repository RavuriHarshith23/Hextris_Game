// ═══════════════════════════════════════════════════════════════
// Hextris - Coin Shop System
// Earn coins by playing, spend them on power-ups
// ═══════════════════════════════════════════════════════════════

(function () {
    'use strict';

    window.CoinShop = {};

    var STORAGE_KEY = 'hextris_coins';
    var _coins = 0;

    // ─── Shop Items ─────────────────────────────────────────
    var SHOP_ITEMS = [
        { id: 'hammer',    name: 'Hammer',    icon: '🔨', desc: 'Clear the most-filled side',         price: 80,  powerType: 'hammer' },
        { id: 'freeze',    name: 'Freeze',    icon: '❄️', desc: 'Freeze all blocks for 5 seconds',    price: 100, powerType: 'freeze' },
        { id: 'colorBomb', name: 'Bomb',      icon: '💣', desc: 'Remove all blocks of one color',     price: 120, powerType: 'colorBomb' },
        { id: 'shield',    name: 'Shield',    icon: '🛡️', desc: 'Block overflow once (saves a life)', price: 150, powerType: 'shield' },
        { id: 'slowTime',  name: 'Slow Time', icon: '⏳', desc: 'Slow block speed for 8 seconds',     price: 100, powerType: 'slowTime' }
    ];

    // ─── Load / Save ────────────────────────────────────────
    function load() {
        try {
            var saved = localStorage.getItem(STORAGE_KEY);
            if (saved) _coins = parseInt(saved) || 0;
        } catch (e) { _coins = 0; }
        // Starting bonus for new players
        if (_coins === 0 && !localStorage.getItem('hextris_coins_init')) {
            _coins = 200;
            localStorage.setItem('hextris_coins_init', '1');
            save();
        }
    }

    function save() {
        try { localStorage.setItem(STORAGE_KEY, String(_coins)); } catch (e) {}
    }

    // ─── Public API ─────────────────────────────────────────
    CoinShop.getCoins = function () { return _coins; };

    CoinShop.addCoins = function (amount) {
        _coins += amount;
        save();
        CoinShop.updateCoinDisplay();

        // Show floating coin animation
        CoinShop.showCoinAnimation('+' + amount);
    };

    CoinShop.spendCoins = function (amount) {
        if (_coins < amount) return false;
        _coins -= amount;
        save();
        CoinShop.updateCoinDisplay();
        return true;
    };

    CoinShop.getItems = function () { return SHOP_ITEMS; };

    // ─── Earn coins from score ──────────────────────────────
    var _lastScoreMilestone = 0;
    CoinShop.checkScoreReward = function (currentScore) {
        // Every 200 score = +10 coins
        var milestone = Math.floor(currentScore / 200);
        if (milestone > _lastScoreMilestone) {
            var earned = (milestone - _lastScoreMilestone) * 10;
            _lastScoreMilestone = milestone;
            CoinShop.addCoins(earned);
        }
    };

    CoinShop.resetScoreMilestone = function () {
        _lastScoreMilestone = 0;
    };

    // ─── Buy a power-up ─────────────────────────────────────
    CoinShop.buyItem = function (itemId) {
        var item = null;
        for (var i = 0; i < SHOP_ITEMS.length; i++) {
            if (SHOP_ITEMS[i].id === itemId) { item = SHOP_ITEMS[i]; break; }
        }
        if (!item) return false;

        if (_coins < item.price) {
            CoinShop.showToast('Not enough coins! Need ' + item.price + ' 🪙');
            return false;
        }

        CoinShop.spendCoins(item.price);

        // Add the power-up charge
        if (typeof PowerUps !== 'undefined') {
            PowerUps.addCharge(item.powerType);
        }

        CoinShop.showToast('Bought ' + item.icon + ' ' + item.name + '!');
        CoinShop.buildShopUI(); // refresh UI
        return true;
    };

    // ─── Update coin display ────────────────────────────────
    CoinShop.updateCoinDisplay = function () {
        var els = document.querySelectorAll('.coin-count');
        for (var i = 0; i < els.length; i++) {
            els[i].textContent = _coins;
        }
        // Update the main menu coin display
        var menuCoins = document.getElementById('menuCoinCount');
        if (menuCoins) menuCoins.textContent = _coins;
    };

    // ─── Build shop UI ──────────────────────────────────────
    CoinShop.buildShopUI = function () {
        var container = document.getElementById('shopGrid');
        if (!container) return;

        // Update the shop coin count
        var shopCoins = document.getElementById('shopCoinCount');
        if (shopCoins) shopCoins.textContent = _coins;

        var html = '';
        for (var i = 0; i < SHOP_ITEMS.length; i++) {
            var item = SHOP_ITEMS[i];
            var canAfford = _coins >= item.price;
            var charges = 0;
            if (typeof PowerUps !== 'undefined' && PowerUps.getCharges) {
                charges = PowerUps.getCharges(item.powerType);
            }

            html += '<div class="shop-item' + (canAfford ? '' : ' too-expensive') + '" data-item="' + item.id + '">' +
                '<div class="shop-item-icon">' + item.icon + '</div>' +
                '<div class="shop-item-name">' + item.name + '</div>' +
                '<div class="shop-item-desc">' + item.desc + '</div>' +
                '<div class="shop-item-own">Owned: ' + charges + '</div>' +
                '<button class="shop-buy-btn" data-item="' + item.id + '"' + (!canAfford ? ' disabled' : '') + '>' +
                    '🪙 ' + item.price +
                '</button>' +
            '</div>';
        }

        container.innerHTML = html;
    };

    // ─── Coin animation ─────────────────────────────────────
    CoinShop.showCoinAnimation = function (text) {
        var el = document.getElementById('coinFloater');
        if (!el) return;
        el.textContent = text + ' 🪙';
        el.style.display = 'block';
        el.style.animation = 'none';
        void el.offsetWidth; // force reflow
        el.style.animation = '';
        setTimeout(function () { el.style.display = 'none'; }, 1500);
    };

    CoinShop.showToast = function (msg) {
        if (typeof PowerUps !== 'undefined' && PowerUps.showToast) {
            PowerUps.showToast(msg);
        } else {
            var toast = document.createElement('div');
            toast.className = 'mp-toast';
            toast.textContent = msg;
            document.body.appendChild(toast);
            setTimeout(function () { toast.style.opacity = '1'; }, 10);
            setTimeout(function () {
                toast.style.opacity = '0';
                setTimeout(function () { toast.remove(); }, 300);
            }, 2000);
        }
    };

    // ─── Bind Events ────────────────────────────────────────
    CoinShop.bindUI = function () {
        $(document).on('click', '.shop-buy-btn', function (e) {
            e.preventDefault();
            e.stopPropagation();
            var itemId = this.dataset.item;
            if (itemId) CoinShop.buyItem(itemId);
        });
    };

    // ─── Init ───────────────────────────────────────────────
    CoinShop.init = function () {
        load();
        CoinShop.bindUI();
        CoinShop.updateCoinDisplay();
    };

    // Auto-init
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', CoinShop.init);
    } else {
        CoinShop.init();
    }

})();
