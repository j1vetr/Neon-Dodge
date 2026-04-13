/* =========================================================
   MULTI LOBBY SCENE  —  Entry / Waiting / Results
   Tamamen yeniden tasarlanmış — oyun estetiğiyle uyumlu
   ========================================================= */

import Phaser from 'phaser';
import {
  getSocket, disconnectSocket, roomState, colorHex, SKIN_KEYS,
} from '../multiState';
import { GAME_WIDTH, GAME_HEIGHT, COLOR_BG, STORAGE_SKIN } from '../constants';

const W  = GAME_WIDTH;
const H  = GAME_HEIGHT;
const CX = W / 2;

const MEDAL_COLORS = ['#ffcc00', '#c8d8e4', '#cc8833'];
const MEDAL_ICONS  = ['🥇', '🥈', '🥉'];

export class MultiLobbyScene extends Phaser.Scene {

  /* ── Phase ── */
  private phase: 'entry' | 'waiting' | 'results' = 'entry';
  private entryContainer!:   Phaser.GameObjects.Container;
  private waitingContainer!: Phaser.GameObjects.Container;
  private resultsContainer!: Phaser.GameObjects.Container;

  /* ── Entry ── */
  private nameDom!:       Phaser.GameObjects.DOMElement;
  private nameInput!:     HTMLInputElement;
  private joinCodeDom!:   Phaser.GameObjects.DOMElement;
  private joinCodeInput!: HTMLInputElement;
  private joinSection!:   Phaser.GameObjects.Container;
  private statusTxt!:     Phaser.GameObjects.Text;
  private statusDot!:     Phaser.GameObjects.Arc;

  /* ── Skin selector ── */
  private selectedSkin  = 0;
  private skinFrames:   Phaser.GameObjects.Image[]     = [];
  private skinBorders:  Phaser.GameObjects.Rectangle[] = [];

  /* ── Waiting ── */
  private waitCodeTxt!:    Phaser.GameObjects.Text;
  private playerListTxts:  Phaser.GameObjects.Text[]      = [];
  private playerRowBgs:    Phaser.GameObjects.Graphics[]  = [];
  private startBtn!:       Phaser.GameObjects.Container;
  private startBtnLabel!:  Phaser.GameObjects.Text;

  /* ── Results ── */
  private resultsRows:     Phaser.GameObjects.Container[] = [];
  private resultsNameTxts: Phaser.GameObjects.Text[]      = [];
  private resultsScoreTxts:Phaser.GameObjects.Text[]      = [];

  /* ── Misc ── */
  private incomingResults?: any[];

  constructor() { super({ key: 'MultiLobbyScene' }); }

  /* ============================================================
     LIFECYCLE
  ============================================================ */
  init(data: any) {
    if (data?.phase === 'results' && data?.results) {
      this.phase = 'results';
      this.incomingResults = data.results;
    } else if (data?.phase === 'waiting') {
      this.phase = 'waiting';
    } else {
      this.phase = 'entry';
    }
    /* State sıfırla */
    this.playerListTxts  = [];
    this.playerRowBgs    = [];
    this.resultsRows     = [];
    this.resultsNameTxts = [];
    this.resultsScoreTxts= [];
    this.skinFrames      = [];
    this.skinBorders     = [];
  }

  create() {
    this.add.rectangle(CX, H / 2, W, H, COLOR_BG);
    this._drawGrid();
    this._drawStars();
    this._drawScanlines();

    this.selectedSkin = parseInt(localStorage.getItem(STORAGE_SKIN) || '0', 10);

    this._buildEntryPanel();
    this._buildWaitingPanel();
    this._buildResultsPanel();
    this._bindSocket();

    this._showPhase(this.phase);
    if (this.phase === 'results' && this.incomingResults) this._renderResults(this.incomingResults);
    if (this.phase === 'waiting') this._renderPlayerList();
  }

  shutdown() {
    const s = getSocket();
    s.off('connect');
    s.off('connect_error');
    s.off('disconnect');
    s.off('room-created');
    s.off('room-joined');
    s.off('room-error');
    s.off('player-joined');
    s.off('player-left');
    s.off('game-starting');
    s.off('game-over');
    s.off('lobby-reset');
    this.nameDom?.destroy();
    this.joinCodeDom?.destroy();
  }

  /* ============================================================
     SOCKET EVENTS
  ============================================================ */
  private _bindSocket() {
    const s = getSocket();

    /* Bağlantı durumu */
    const _setStatus = (txt: string, col: number) => {
      this.statusTxt?.setText(txt);
      this.statusDot?.setFillStyle(col, 1);
    };

    if (s.connected) _setStatus('BAĞLANDI', 0x00ff88);
    s.on('connect',       () => _setStatus('BAĞLANDI',       0x00ff88));
    s.on('disconnect',    () => _setStatus('BAĞLANTI KESİLDİ', 0xff4466));
    s.on('connect_error', () => _setStatus('BAĞLANTI HATASI',  0xff4466));

    s.on('room-created', ({ code, myId, myColor, players }: any) => {
      roomState.code = code;
      roomState.myId = myId;
      roomState.myColor = myColor;
      roomState.players.clear();
      for (const p of players) roomState.players.set(p.id, p);
      this.waitCodeTxt.setText(code);
      this._showPhase('waiting');
      this._renderPlayerList();
    });

    s.on('room-joined', ({ code, myId, myColor, players }: any) => {
      roomState.code = code;
      roomState.myId = myId;
      roomState.myColor = myColor;
      roomState.players.clear();
      for (const p of players) roomState.players.set(p.id, p);
      this.waitCodeTxt.setText(code);
      this._showPhase('waiting');
      this._renderPlayerList();
    });

    s.on('room-error', ({ msg }: any) => {
      _setStatus('⚠  ' + msg, 0xff4466);
      this.time.delayedCall(3000, () => {
        const s2 = getSocket();
        if (s2.connected) _setStatus('BAĞLANDI', 0x00ff88);
      });
    });

    s.on('player-joined', (p: any) => {
      roomState.players.set(p.id, p);
      this._renderPlayerList();
    });

    s.on('player-left', ({ id }: any) => {
      roomState.players.delete(id);
      this._renderPlayerList();
    });

    s.on('game-starting', () => {
      this.scene.start('GameScene', {
        skin:     this.selectedSkin,
        multi:    true,
        myId:     roomState.myId,
        myColor:  roomState.myColor,
        code:     roomState.code,
        skinKey:  SKIN_KEYS[this.selectedSkin] ?? 'skin-klasik',
      });
    });

    s.on('lobby-reset', ({ players }: any) => {
      roomState.players.clear();
      for (const p of players) roomState.players.set(p.id, p);
      this._showPhase('waiting');
      this._renderPlayerList();
    });
  }

  /* ============================================================
     ENTRY PANEL
  ============================================================ */
  private _buildEntryPanel() {
    const c = this.add.container(0, 0);
    this.entryContainer = c;

    /* ── BAŞLIK ── */
    this._neonTitle(c, CX, 112, '⬡  ÇOK OYUNCULU', '#ff8800', 0xff8800, '46px');

    /* Bağlantı durumu */
    this.statusDot = this.add.circle(CX - 92, 168, 6, 0xffaa00, 1);
    this.statusTxt = this.add.text(CX - 80, 168, 'BAĞLANIYOR...', {
      fontSize: '18px', fontFamily: 'monospace', color: '#ffaa00',
    }).setOrigin(0, 0.5);
    c.add([this.statusDot, this.statusTxt]);

    /* ── AYIRICI 1 ── */
    c.add(this._hRule(206, 0xff8800, 0.22));

    /* ── AD BÖLÜMÜ ── */
    c.add(this._sectionLabel(60, 234, 'OYUNCU ADI'));

    this.nameDom = this.add.dom(CX, 292, 'input', `
      width:340px; height:62px;
      background:transparent; border:none;
      border-bottom:2px solid rgba(255,136,0,0.6);
      color:#ff8800; font-family:"Orbitron",monospace;
      font-size:32px; font-weight:700;
      text-align:center; outline:none;
      text-transform:uppercase; letter-spacing:6px;
    `).setDepth(5);
    this.nameInput = this.nameDom.node as HTMLInputElement;
    this.nameInput.maxLength = 8;
    this.nameInput.placeholder = 'ADI GİR';
    (this.nameInput as any).style.setProperty('--placeholder-color', 'rgba(255,136,0,0.3)');
    c.add(this.nameDom);

    /* ── AYIRICI 2 ── */
    c.add(this._hRule(348, 0xff8800, 0.22));

    /* ── SKIN BÖLÜMÜ ── */
    c.add(this._sectionLabel(60, 374, 'ROKETİNİ SEÇ'));
    this._buildSkinSelector(c, 458);

    /* ── AYIRICI 3 ── */
    c.add(this._hRule(518, 0x00ffff, 0.15));

    /* ── ODA OLUŞTUR butonu ── */
    c.add(this._bigBtn(CX, 616, '◈  YENİ ODA OLUŞTUR', 0x00ffff, () => {
      const name = this.nameInput.value.toUpperCase().trim() || 'PLAYER';
      getSocket().emit('create-room', { name, skin: SKIN_KEYS[this.selectedSkin] });
    }));

    /* ── ODAYA KATIL butonu ── */
    c.add(this._bigBtn(CX, 732, '⬡  ODAYA KATIL', 0xff8800, () => {
      this.joinSection.setVisible(!this.joinSection.visible);
      if (this.joinSection.visible) {
        this.time.delayedCall(80, () => this.joinCodeInput?.focus());
      }
    }));

    /* ── JOIN KODU BÖLÜMÜ (toggle) ── */
    this.joinSection = this.add.container(0, 0);
    this.joinSection.setVisible(false);
    c.add(this.joinSection);

    const joinBg = this.add.graphics();
    joinBg.fillStyle(0x0a0610, 0.95);
    joinBg.fillRoundedRect(CX - 300, 790, 600, 200, 18);
    joinBg.lineStyle(2, 0xff8800, 0.5);
    joinBg.strokeRoundedRect(CX - 300, 790, 600, 200, 18);
    joinBg.lineStyle(3, 0xff8800, 0.9);
    joinBg.lineBetween(CX - 278, 792, CX + 278, 792);
    this.joinSection.add(joinBg);

    this.joinSection.add(this.add.text(CX, 826, 'ODA KODU', {
      fontSize: '16px', fontFamily: '"Orbitron",monospace',
      color: '#cc6600', letterSpacing: 5,
    }).setOrigin(0.5));

    this.joinCodeDom = this.add.dom(CX, 882, 'input', `
      width:220px; height:56px;
      background:transparent; border:none;
      border-bottom:3px solid #ff8800;
      color:#ff8800; font-family:"Orbitron",monospace;
      font-size:38px; font-weight:700;
      text-align:center; outline:none;
      text-transform:uppercase; letter-spacing:10px;
    `).setDepth(10);
    this.joinCodeInput = this.joinCodeDom.node as HTMLInputElement;
    this.joinCodeInput.maxLength = 5;
    this.joinCodeInput.placeholder = '· · · · ·';
    this.joinSection.add(this.joinCodeDom);

    /* KATIL küçük butonu */
    this.joinSection.add(this._smallBtn(CX, 960, '  KATIL  ', 0xff8800, () => {
      const code = this.joinCodeInput.value.toUpperCase().trim();
      const name = this.nameInput.value.toUpperCase().trim() || 'PLAYER';
      if (code.length < 3) return;
      getSocket().emit('join-room', { code, name, skin: SKIN_KEYS[this.selectedSkin] });
    }));

    /* ── GERİ ── */
    c.add(this._backBtn(CX, H - 96, () => {
      disconnectSocket();
      this.scene.start('StartScene');
    }));
  }

  /* ============================================================
     WAITING PANEL
  ============================================================ */
  private _buildWaitingPanel() {
    const c = this.add.container(0, 0);
    this.waitingContainer = c;

    /* ── Başlık ── */
    this._neonTitle(c, CX, 108, 'BEKLEME ODASI', '#00ffff', 0x00ffff, '42px');

    /* ── Kod kartı ── */
    const codeCard = this.add.graphics();
    codeCard.fillStyle(0x001520, 0.85);
    codeCard.fillRoundedRect(CX - 280, 148, 560, 168, 20);
    codeCard.lineStyle(2, 0x00ffff, 0.4);
    codeCard.strokeRoundedRect(CX - 280, 148, 560, 168, 20);
    codeCard.lineStyle(3, 0x00ffff, 1);
    codeCard.lineBetween(CX - 258, 150, CX + 258, 150);
    c.add(codeCard);

    c.add(this.add.text(CX, 178, 'ODA KODU', {
      fontSize: '15px', fontFamily: '"Orbitron",monospace',
      color: '#224455', letterSpacing: 5,
    }).setOrigin(0.5));

    this.waitCodeTxt = this.add.text(CX, 252, '- - - - -', {
      fontSize: '58px', fontFamily: '"Orbitron",monospace', fontStyle: 'bold',
      color: '#00ffff', letterSpacing: 10,
      shadow: { color: '#00ffff', blur: 20, fill: true, stroke: false, offsetX: 0, offsetY: 0 },
    }).setOrigin(0.5);
    c.add(this.waitCodeTxt);

    /* Kopyala */
    const copyBtn = this._smallBtn(CX, 342, '  ⎘  KOPYALA  ', 0x2299bb, () => {
      navigator.clipboard?.writeText(roomState.code).catch(() => {});
      (copyBtn.getByName('lbl') as Phaser.GameObjects.Text | null)
        ?.setText('  ✓  KOPYALANDI  ');
      this.time.delayedCall(2000, () =>
        (copyBtn.getByName('lbl') as Phaser.GameObjects.Text | null)
          ?.setText('  ⎘  KOPYALA  '));
    });
    c.add(copyBtn);

    /* ── OYUNCULAR listesi ── */
    c.add(this._hRule(390, 0x00ffff, 0.14));
    c.add(this._sectionLabel(60, 410, 'OYUNCULAR'));

    for (let i = 0; i < 8; i++) {
      const ry  = 440 + i * 72;
      const rbg = this.add.graphics();
      rbg.fillStyle(0x001520, 0);
      rbg.fillRoundedRect(50, ry - 26, W - 100, 52, 10);
      this.playerRowBgs.push(rbg);
      c.add(rbg);

      const txt = this.add.text(96, ry, '', {
        fontSize: '25px', fontFamily: '"Orbitron",monospace',
        fontStyle: 'bold', color: '#1a2a33',
      }).setOrigin(0, 0.5);
      this.playerListTxts.push(txt);
      c.add(txt);
    }

    c.add(this._hRule(1022, 0x00ffff, 0.14));

    /* ── BAŞLAT ── */
    this.startBtn = this._bigBtn(CX, 1114, '▶  OYUNU BAŞLAT', 0x00ff88, () => {
      getSocket().emit('start-game');
    });
    c.add(this.startBtn);
    this.startBtnLabel = this.startBtn.getByName('lbl') as Phaser.GameObjects.Text;

    /* ── Çık ── */
    c.add(this._backBtn(CX, H - 96, () => {
      disconnectSocket();
      this.scene.start('StartScene');
    }));
  }

  /* ============================================================
     RESULTS PANEL
  ============================================================ */
  private _buildResultsPanel() {
    const c = this.add.container(0, 0);
    this.resultsContainer = c;

    /* ── Başlık ── */
    this._neonTitle(c, CX, 108, '🏆  SONUÇLAR', '#ffcc00', 0xffcc00, '50px');
    c.add(this._hRule(158, 0xffaa00, 0.28));

    /* ── 8 sıralama satırı ── */
    const ROW_H = 82, GAP = 10, Y0 = 180;
    for (let i = 0; i < 8; i++) {
      const ry  = Y0 + i * (ROW_H + GAP);
      const row = this.add.container(0, 0);

      /* Satır arka planı */
      const bg = this.add.graphics();
      const bgCol = i === 0 ? 0x241600 : i === 1 ? 0x12181e : i === 2 ? 0x0d1208 : 0x070c12;
      bg.fillStyle(bgCol, 0.9);
      bg.fillRoundedRect(44, ry, W - 88, ROW_H, 14);
      if (i < 3) {
        const bcs = [0xffcc00, 0x99aacc, 0xcc7733];
        bg.lineStyle(i === 0 ? 2 : 1, bcs[i], i === 0 ? 0.8 : 0.4);
        bg.strokeRoundedRect(44, ry, W - 88, ROW_H, 14);
      }
      row.add(bg);

      /* Rank / medal */
      const rankTxt = this.add.text(82, ry + ROW_H / 2, '', {
        fontSize: i === 0 ? '30px' : '24px', fontFamily: '"Orbitron",monospace',
      }).setOrigin(0, 0.5);
      row.add(rankTxt);

      /* Name */
      const nameTxt = this.add.text(160, ry + ROW_H / 2, '', {
        fontSize: i === 0 ? '27px' : '23px', fontFamily: '"Orbitron",monospace',
        fontStyle: 'bold', color: '#ffffff',
      }).setOrigin(0, 0.5);
      row.add(nameTxt);
      this.resultsNameTxts.push(nameTxt);
      /* store rankTxt ref for medal */
      (nameTxt as any).__rank = rankTxt;

      /* Score */
      const scoreTxt = this.add.text(W - 62, ry + ROW_H / 2, '', {
        fontSize: i === 0 ? '27px' : '22px', fontFamily: '"Orbitron",monospace',
        fontStyle: 'bold', color: '#ffffff',
      }).setOrigin(1, 0.5);
      row.add(scoreTxt);
      this.resultsScoreTxts.push(scoreTxt);

      c.add(row);
      this.resultsRows.push(row);
    }

    c.add(this._hRule(Y0 + 8 * (ROW_H + GAP) + 4, 0xffaa00, 0.18));

    /* ── Butonlar ── */
    c.add(this._bigBtn(CX, 1128, '↩  LOBİYE DÖN', 0x00ffff, () => {
      getSocket().emit('return-to-lobby');
      this._showPhase('waiting');
    }));
    c.add(this._backBtn(CX, 1248, () => {
      disconnectSocket();
      this.scene.start('StartScene');
    }));
  }

  /* ============================================================
     RENDER HELPERS
  ============================================================ */
  _renderResults(results: any[]) {
    for (let i = 0; i < this.resultsNameTxts.length; i++) {
      const r = results[i];
      if (!r) {
        this.resultsNameTxts[i].setText('');
        this.resultsScoreTxts[i].setText('');
        (this.resultsNameTxts[i] as any).__rank?.setText('');
        continue;
      }
      const isMe  = r.id === roomState.myId;
      const medal = i < 3 ? MEDAL_ICONS[i] : `${i + 1}`;
      const col   = i < 3 ? MEDAL_COLORS[i] : colorHex(r.color);
      const meTag = isMe ? '  ◄' : '';

      (this.resultsNameTxts[i] as any).__rank?.setText(medal);
      this.resultsNameTxts[i].setText(r.name + meTag);
      this.resultsNameTxts[i].setStyle({ color: col });
      this.resultsScoreTxts[i].setText(String(Math.floor(r.score)));
      this.resultsScoreTxts[i].setStyle({ color: col });
    }
    roomState.results = results;
  }

  private _renderPlayerList() {
    const players  = [...roomState.players.values()];
    const myPlayer = roomState.players.get(roomState.myId);
    const amHost   = myPlayer?.isHost ?? false;

    for (let i = 0; i < this.playerListTxts.length; i++) {
      const p   = players[i];
      const rbg = this.playerRowBgs[i];

      if (!p) {
        this.playerListTxts[i].setText('');
        rbg?.clear();
        rbg?.fillStyle(0x001520, 0);
        rbg?.fillRoundedRect(50, 440 - 26 + i * 72, W - 100, 52, 10);
        continue;
      }

      const hex     = colorHex(p.color);
      const meTag   = p.id === roomState.myId ? '  ◄' : '';
      const hostTag = p.isHost ? '  👑' : '';
      this.playerListTxts[i].setText(`■  ${p.name}${hostTag}${meTag}`);
      this.playerListTxts[i].setStyle({ color: hex });

      rbg?.clear();
      rbg?.fillStyle(p.color, 0.06);
      rbg?.fillRoundedRect(50, 440 - 26 + i * 72, W - 100, 52, 10);
      rbg?.lineStyle(1, p.color, 0.25);
      rbg?.strokeRoundedRect(50, 440 - 26 + i * 72, W - 100, 52, 10);
    }

    this.startBtn?.setVisible(amHost);
    if (amHost) {
      const ok = players.length >= 1;
      this.startBtnLabel?.setStyle({ color: ok ? '#001800' : '#224422' });
      this.startBtn?.setAlpha(ok ? 1 : 0.45);
    }
  }

  private _showPhase(ph: 'entry' | 'waiting' | 'results') {
    this.phase = ph;
    this.entryContainer?.setVisible(ph === 'entry');
    this.waitingContainer?.setVisible(ph === 'waiting');
    this.resultsContainer?.setVisible(ph === 'results');
    if (this.nameDom)     this.nameDom.setVisible(ph === 'entry');
    if (this.joinCodeDom) this.joinCodeDom.setVisible(ph === 'entry');
  }

  private _selectSkin(i: number) {
    this.selectedSkin = i;
    for (let j = 0; j < 4; j++) {
      const sel = j === i;
      this.skinBorders[j]?.setStrokeStyle(sel ? 3 : 1.5, sel ? 0xff8800 : 0x332211, 1);
      this.skinFrames[j]?.setAlpha(sel ? 1 : 0.30);
    }
    localStorage.setItem(STORAGE_SKIN, String(i));
  }

  /* ============================================================
     BACKGROUND LAYERS  (StartScene gibi)
  ============================================================ */
  private _drawGrid() {
    const g  = this.add.graphics();
    const vX = CX, vY = H * 0.55;
    for (let i = 0; i <= 10; i++) {
      const t2 = (i / 10) ** 1.8;
      const y  = vY + (H - vY) * t2;
      g.lineStyle(2, 0x00aaff, 0.05 + t2 * 0.14);
      g.lineBetween(0, y, W, y);
    }
    for (let i = 0; i <= 12; i++) {
      const bx = (i / 12) * W;
      g.lineStyle(2, 0x00aaff, 0.05 + 0.08 * Math.abs(i - 6) / 6);
      g.lineBetween(vX, vY, bx, H);
    }
    g.lineStyle(1, 0x001428, 0.20);
    for (let x = 0; x <= W; x += 80) g.lineBetween(x, 0, x, vY);
    for (let y = 0; y <= vY; y += 80) g.lineBetween(0, y, W, y);
  }

  private _drawStars() {
    const pal = [0xffffff, 0x00ffff, 0xff2060, 0xffcc00, 0x8844ff];
    for (let i = 0; i < 80; i++) {
      const x   = Phaser.Math.Between(0, W);
      const y   = Phaser.Math.Between(0, H * 0.55);
      const r   = Math.random() * 2.5 + 0.5;
      const col = pal[Math.floor(Math.random() * pal.length)];
      const a   = Math.random() * 0.50 + 0.06;
      const s   = this.add.circle(x, y, r, col, a);
      this.tweens.add({
        targets: s, alpha: { from: a, to: a * 0.08 },
        duration: Phaser.Math.Between(900, 3200), yoyo: true, repeat: -1,
        delay: Phaser.Math.Between(0, 2800), ease: 'Sine.easeInOut',
      });
    }
  }

  private _drawScanlines() {
    const g = this.add.graphics().setAlpha(0.04);
    for (let y = 0; y < H; y += 8) {
      g.fillStyle(0x000000, 1);
      g.fillRect(0, y, W, 4);
    }
  }

  /* ============================================================
     SKIN SELECTOR
  ============================================================ */
  private _buildSkinSelector(c: Phaser.GameObjects.Container, cy: number) {
    const sp = 148, sx0 = CX - sp * 1.5;
    for (let i = 0; i < 4; i++) {
      const x = sx0 + i * sp;

      /* Arka plan */
      const bg = this.add.graphics();
      bg.fillStyle(0x0a0510, 0.7);
      bg.fillRoundedRect(x - 46, cy - 46, 92, 92, 14);
      c.add(bg);

      /* Kenarlık */
      const bdr = this.add.rectangle(x, cy, 92, 92, 0, 0)
        .setStrokeStyle(i === this.selectedSkin ? 3 : 1.5,
                        i === this.selectedSkin ? 0xff8800 : 0x331a00, 1);
      this.skinBorders.push(bdr);
      c.add(bdr);

      /* Resim */
      const img = this.add.image(x, cy, SKIN_KEYS[i])
        .setDisplaySize(64, 76)
        .setAlpha(i === this.selectedSkin ? 1 : 0.30);
      this.skinFrames.push(img);
      c.add(img);

      /* Seçili glow hale */
      if (i === this.selectedSkin) {
        const gl = this.add.graphics();
        gl.lineStyle(14, 0xff8800, 0.07);
        gl.strokeRoundedRect(x - 55, cy - 55, 110, 110, 18);
        c.add(gl);
      }

      bdr.setInteractive({ useHandCursor: true }).on('pointerdown', () => this._selectSkin(i));
      img.setInteractive({ useHandCursor: true }).on('pointerdown', () => this._selectSkin(i));
    }
  }

  /* ============================================================
     BUTTON HELPERS
  ============================================================ */

  /* Büyük CTA butonu */
  private _bigBtn(
    x: number, y: number, label: string, col: number, cb: () => void,
  ): Phaser.GameObjects.Container {
    const bw = 640, bh = 88;

    const bg = this.add.graphics();
    const _bg = (a: number) => {
      bg.clear(); bg.fillStyle(col, a);
      bg.fillRoundedRect(-bw / 2, -bh / 2, bw, bh, 16);
    };
    _bg(0.08);

    const border = this.add.graphics();
    border.lineStyle(2, col, 0.80);
    border.strokeRoundedRect(-bw / 2, -bh / 2, bw, bh, 16);

    const topL = this.add.graphics();
    topL.lineStyle(3, col, 1);
    topL.lineBetween(-bw / 2 + 20, -bh / 2 + 1.5, bw / 2 - 20, -bh / 2 + 1.5);

    const lbl = this.add.text(0, 0, label, {
      fontSize: '28px', fontFamily: '"Orbitron",monospace',
      fontStyle: 'bold', color: colorHex(col),
      shadow: { color: colorHex(col), blur: 12, fill: false, stroke: true, offsetX: 0, offsetY: 0 },
    }).setOrigin(0.5).setName('lbl');

    const hit = this.add.rectangle(0, 0, bw, bh, 0xffffff, 0)
      .setInteractive({ useHandCursor: true });
    hit.on('pointerover',  () => _bg(0.18));
    hit.on('pointerout',   () => _bg(0.08));
    hit.on('pointerdown',  () => {
      this.tweens.add({
        targets: [border, lbl], scaleX: 0.97, scaleY: 0.97,
        duration: 55, yoyo: true, onComplete: cb,
      });
    });

    return this.add.container(x, y, [bg, border, topL, lbl, hit]);
  }

  /* Küçük yardımcı buton */
  private _smallBtn(
    x: number, y: number, label: string, col: number, cb: () => void,
  ): Phaser.GameObjects.Container {
    const bw = 260, bh = 60;

    const bg = this.add.graphics();
    const _bg = (a: number) => {
      bg.clear(); bg.fillStyle(col, a);
      bg.fillRoundedRect(-bw / 2, -bh / 2, bw, bh, 12);
    };
    _bg(0.10);

    const bdr = this.add.graphics();
    bdr.lineStyle(2, col, 0.65);
    bdr.strokeRoundedRect(-bw / 2, -bh / 2, bw, bh, 12);

    const topL = this.add.graphics();
    topL.lineStyle(2, col, 0.85);
    topL.lineBetween(-bw / 2 + 14, -bh / 2 + 1, bw / 2 - 14, -bh / 2 + 1);

    const lbl = this.add.text(0, 0, label, {
      fontSize: '20px', fontFamily: '"Orbitron",monospace',
      fontStyle: 'bold', color: colorHex(col),
    }).setOrigin(0.5).setName('lbl');

    const hit = this.add.rectangle(0, 0, bw, bh, 0xffffff, 0)
      .setInteractive({ useHandCursor: true });
    hit.on('pointerover', () => _bg(0.22));
    hit.on('pointerout',  () => _bg(0.10));
    hit.on('pointerdown', cb);

    return this.add.container(x, y, [bg, bdr, topL, lbl, hit]);
  }

  /* Geri / alt link butonu */
  private _backBtn(x: number, y: number, cb: () => void) {
    const lbl = this.add.text(x, y, '←  ANA MENÜ', {
      fontSize: '20px', fontFamily: '"Orbitron",monospace',
      color: '#334455', letterSpacing: 2,
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    lbl.on('pointerover', () => lbl.setStyle({ color: '#667788' }));
    lbl.on('pointerout',  () => lbl.setStyle({ color: '#334455' }));
    lbl.on('pointerdown', cb);
    return lbl;
  }

  /* ============================================================
     LAYOUT HELPERS
  ============================================================ */
  private _neonTitle(
    c: Phaser.GameObjects.Container,
    x: number, y: number, txt: string,
    hex: string, col: number, size: string,
  ) {
    c.add(this.add.text(x, y, txt, {
      fontSize: size, fontFamily: '"Orbitron",monospace', fontStyle: 'bold',
      color: hex,
      stroke: colorHex(col & 0x333333), strokeThickness: 3,
      shadow: { color: hex, blur: 28, fill: false, stroke: true, offsetX: 0, offsetY: 0 },
    }).setOrigin(0.5));
  }

  private _hRule(y: number, col: number, alpha: number) {
    const g = this.add.graphics();
    g.lineStyle(1, col, alpha);
    g.lineBetween(50, y, W - 50, y);
    /* merkez elmas */
    g.fillStyle(col, alpha * 1.8);
    g.fillRect(CX - 4, y - 4, 8, 8);
    return g;
  }

  private _sectionLabel(x: number, y: number, label: string) {
    return this.add.text(x, y, label, {
      fontSize: '15px', fontFamily: '"Orbitron",monospace',
      color: '#334455', letterSpacing: 4,
    }).setOrigin(0, 0.5);
  }
}
