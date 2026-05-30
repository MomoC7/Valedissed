/**
 * VALEDISSED — Navbar Particle System
 * Organic sine-wave particles. Gold (dark) · Rose-mauve (light).
 * Three tiers: motes (texture) · orbs (glow) · sparks (focal).
 */
(function () {
    'use strict';

    var CFG = {
        dark: {
            motes: { rgb: ['201,168,76','232,201,122','255,220,100'], n: 10, sz: [0.6,1.4], op: [0.15,0.30] },
            orbs:  { rgb: ['201,168,76','255,230,140','180,148,60'],  n: 7,  sz: [1.8,2.8], op: [0.35,0.55] },
            minis: { rgb: ['255,235,155','232,201,122'],              n: 2,  sz: [1.0,1.6], op: [0.45,0.65] }
        },
        light: {
            motes: { rgb: ['217,70,239','236,72,153','168,85,247'],    n: 10, sz: [0.6,1.4], op: [0.15,0.30] },
            orbs:  { rgb: ['217,70,239','236,72,153','192,38,211'],    n: 7,  sz: [1.8,2.8], op: [0.35,0.55] },
            minis: { rgb: ['236,72,153','168,85,247'],                n: 2,  sz: [1.0,1.6], op: [0.45,0.65] }
        }
    };

    var VX   = [6, 18];     /* px/s horizontal */
    var FREQ = [0.10, 0.35]; /* rad/s sine freq  */
    var AMP  = [5, 17];     /* px amplitude     */

    function rnd(a, b) { return a + Math.random() * (b - a); }
    function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

    function isDark() {
        return document.documentElement.classList.contains('dark');
    }

    function makePart(type, cfg, w, h, xRatio) {
        var sz = rnd(cfg.sz[0], cfg.sz[1]);
        var gr = type === 'orbs' ? sz * 4.2 : type === 'minis' ? sz * 4.5 : sz * 2.0;
        return {
            type: type,
            x:     xRatio !== undefined ? xRatio * w : rnd(0, w),
            baseY: rnd(sz * 3, Math.max(h - sz * 3, sz * 4)),
            phase: rnd(0, Math.PI * 2),
            freq:  rnd(FREQ[0], FREQ[1]),
            amp:   rnd(AMP[0], AMP[1]),
            vx:    rnd(VX[0], VX[1]),
            sz: sz, gr: gr,
            op:    rnd(cfg.op[0], cfg.op[1]),
            rgb:   pick(cfg.rgb)
        };
    }

    function System(canvas) {
        this.cv  = canvas;
        this.ctx = canvas.getContext('2d');
        this.pts = [];
        this.raf = null;
        this.lt  = null;
        var self = this;
        this._onResize = function () { self._resize(); };
        window.addEventListener('resize', this._onResize);
        this._resize();
        this._spawn();
        this._tick = this._tick.bind(this);
        this.raf = requestAnimationFrame(this._tick);
    }

    System.prototype._resize = function () {
        var p = this.cv.parentElement;
        if (!p) return;
        var r = p.getBoundingClientRect();
        this.cv.width  = r.width  || p.offsetWidth  || 400;
        this.cv.height = r.height || p.offsetHeight || 80;
    };

    System.prototype._cfg = function () {
        return isDark() ? CFG.dark : CFG.light;
    };

    System.prototype._spawn = function () {
        this.pts = [];
        var c = this._cfg();
        var w = this.cv.width, h = this.cv.height;

        /* Motes: distribuidos uniformemente */
        for (var j = 0; j < c.motes.n; j++) {
            this.pts.push(makePart('mote', c.motes, w, h, j / c.motes.n));
        }

        /* Orbs: distribuidos uniformemente */
        for (var j = 0; j < c.orbs.n; j++) {
            this.pts.push(makePart('orb', c.orbs, w, h, (j + 0.5) / c.orbs.n));
        }

        /* Minis: posiciones forzadas separadas */
        var miniPos = [0.15, 0.65];
        for (var j = 0; j < c.minis.n; j++) {
            this.pts.push(makePart('mini', c.minis, w, h, miniPos[j]));
        }
    };


    System.prototype._tick = function (ts) {
        if (this.lt === null) this.lt = ts;
        var dt = Math.min((ts - this.lt) / 1000, 0.05);
        this.lt = ts;

        var w = this.cv.width, h = this.cv.height;
        var ctx = this.ctx;
        ctx.clearRect(0, 0, w, h);

        var c = this._cfg();
        var cfgMap = { mote: c.motes, orb: c.orbs, mini: c.minis };
        var t = ts * 0.001;

        for (var i = 0; i < this.pts.length; i++) {
            var p = this.pts[i];
            p.x += p.vx * dt;

            var y = p.baseY + p.amp * Math.sin(t * p.freq + p.phase);

            if (p.x > w + p.gr + 10) {
                var fresh = makePart(p.type, cfgMap[p.type], w, h, 0);
                fresh.x = -p.gr - 10;
                this.pts[i] = fresh;
                continue;
            }

            if (p.type === 'mote') {
                ctx.beginPath();
                ctx.arc(p.x, y, p.sz, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(' + p.rgb + ',' + p.op.toFixed(2) + ')';
                ctx.fill();
            } else {
                var grd = ctx.createRadialGradient(p.x, y, 0, p.x, y, p.gr);
                grd.addColorStop(0,   'rgba(' + p.rgb + ',' + p.op.toFixed(2) + ')');
                grd.addColorStop(0.35,'rgba(' + p.rgb + ',' + (p.op * 0.45).toFixed(2) + ')');
                grd.addColorStop(1,   'rgba(' + p.rgb + ',0)');
                ctx.beginPath();
                ctx.arc(p.x, y, p.gr, 0, Math.PI * 2);
                ctx.fillStyle = grd;
                ctx.fill();
                
                ctx.beginPath();
                ctx.arc(p.x, y, p.sz * 0.5, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(' + p.rgb + ',' + Math.min(p.op * 1.6, 0.95).toFixed(2) + ')';
                ctx.fill();
            }
        }
        this.raf = requestAnimationFrame(this._tick);
    };

    System.prototype.destroy = function () {
        cancelAnimationFrame(this.raf);
        window.removeEventListener('resize', this._onResize);
    };

    /* ── Bootstrap ── */
    var instances = [];

    function init() {
        document.querySelectorAll('canvas.vld-particles').forEach(function (cv) {
            instances.push(new System(cv));
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    window.ValedissedParticles = { instances: instances };
})();
