/* =========================================================
   MULTI LOBBY SCENE  —  Entry / Waiting / Results  v3
   ========================================================= */

import Phaser from 'phaser';
import {
  getSocket, disconnectSocket, roomState, colorHex, SKIN_KEYS,
} from '../multiState';
import { GAME_WIDTH, GAME_HEIGHT, COLOR_BG, STORAGE_SKIN } from '../constants';

const W  = GAME_WIDTH;    // 800
const H  = GAME_HEIGHT;   // 1400
const CX = W / 2;         // 400

const MEDAL_COLORS = ['#ffcc00', '#c8d8e4', '#cc7733'];
const MEDAL_ICONS  = ['🥇', '🥈', '🥉'];
const STORAGE_NAME = 'neonDodge_playerName';

/* ── Thin wrapper for a re-drawable Graphics that also stores a color ── */
type RBg = { g: Phaser.GameObjects.Graphics; y: number };

export class MultiLobbyScene extends Phaser.Scene {

  /* Phase */
  private phase: 'entry' | 'waiting' | 'results' = 'entry';
  private entryContainer!:   Phaser.GameObjects.Container;
  private waitingContainer!: Phaser.GameObjects.Container;
  private resultsContainer!: Phaser.GameObjects.Container;

  /* Entry — name */
  private nameDom!:      Phaser.GameObjects.DOMElement;
  private nameInput!:    HTMLInputElement;
  private nameCounter!:  Phaser.GameObjects.Text;
  private nameBorder!:   Phaser.GameObjects.Graphics;

  /* Entry — join code (5-box) */
  private joinCodeDom!:   Phaser.GameObjects.DOMElement;
  private joinCodeInput!: HTMLInputElement;
  private codeBoxes:      Phaser.GameObjects.Graphics[]    = [];
  private codeLetters:    Phaser.GameObjects.Text[]        = [];
  private joinSection!:   Phaser.GameObjects.Container;
  private joinOpen = false;
  private joinArrow!: Phaser.GameObjects.Text;

  /* Entry — status */
  private statusDot!:  Phaser.GameObjects.Arc;
  private statusTxt!:  Phaser.GameObjects.Text;
  private errorTxt!:   Phaser.GameObjects.Text;
  private errorTimer?: Phaser.Time.TimerEvent;

  /* Entry — buttons */
  private createBtn!:      Phaser.GameObjects.Container;
  private createBtnLbl!:   Phaser.GameObjects.Text;
  private joinBtn!:        Phaser.GameObjects.Container;

  /* Skin selector */
  private selectedSkin  = 0;
  private skinFrames:   Phaser.GameObjects.Image[]     = [];
  private skinBorders:  Phaser.GameObjects.Rectangle[] = [];

  /* Waiting */
  private waitCodeTxt!:    Phaser.GameObjects.Text;
  private playerListTxts:  Phaser.GameObjects.Text[] = [];
  private playerRowBgs:    RBg[]                     = [];
  private startBtn!:       Phaser.GameObjects.Container;
  private startBtnLabel!:  Phaser.GameObjects.Text;

  /* Results */
  private resultsNameTxts:  Phaser.GameObjects.Text[] = [];
  private resultsScoreTxts: Phaser.GameObjects.Text[] = [];
  private resultsRankTxts:  Phaser.GameObjects.Text[] = [];

  /* Scene data */
  private incomingResults?: any[];

  constructor() { super({ key: 'MultiLobbyScene' }); }

  /* ==============================================================
     LIFECYCLE
  ============================================================== */
  init(data: any) {
    if (data?.phase === 'results' && data?.results) {
      this.phase = 'results';
      this.incomingResults = data.results;
    } else if (data?.phase === 'waiting') {
      this.phase = 'waiting';
    } else {
      this.phase = 'entry';
    }
    this.playerListTxts  = [];
    this.playerRowBgs    = [];
    this.resultsNameTxts = [];
    this.resultsScoreTxts= [];
    this.resultsRankTxts = [];
    this.skinFrames      = [];
    this.skinBorders     = [];
    this.codeBoxes       = [];
    this.codeLetters     = [];
    this.joinOpen        = false;
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
    s.off('connect');  s.off('connect_error');  s.off('disconnect');
    s.off('room-created');  s.off('room-joined');  s.off('room-error');
    s.off('player-joined'); s.off('player-left');
    s.off('game-starting'); s.off('game-over');    s.off('lobby-reset');
    this.nameDom?.destroy();
    this.joinCodeDom?.destroy();
  }

  /* ==============================================================
     SOCKET
  ============================================================== */
  private _bindSocket() {
    const s = getSocket();

    const _status = (txt: string, col: number) => {
      this.statusTxt?.setText(txt);
      this.statusDot?.setFillStyle(col, 1);
    };

    if (s.connected) _status('BAĞLANDI', 0x00ff88);
    s.on('connect',       () => _status('BAĞLANDI',         0x00ff88));
    s.on('disconnect',    () => _status('BAĞLANTI KESİLDİ', 0xff4466));
    s.on('connect_error', () => _status('BAĞLANTI HATASI',  0xff4466));

    s.on('room-created', ({ code, myId, myColor, players }: any) => {
      this._resetCreateBtn();
      roomState.code = code; roomState.myId = myId; roomState.myColor = myColor;
      roomState.players.clear();
      for (const p of players) roomState.players.set(p.id, p);
      this.waitCodeTxt.setText(code);
      this._showPhase('waiting');
      this._renderPlayerList();
    });

    s.on('room-joined', ({ code, myId, myColor, players }: any) => {
      this._resetCreateBtn();
      roomState.code = code; roomState.myId = myId; roomState.myColor = myColor;
      roomState.players.clear();
      for (const p of players) roomState.players.set(p.id, p);
      this.waitCodeTxt.setText(code);
      this._showPhase('waiting');
      this._renderPlayerList();
    });

    s.on('room-error', ({ msg }: any) => {
      this._resetCreateBtn();
      this._showError(msg);
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
        skin:    this.selectedSkin,
        multi:   true,
        myId:    roomState.myId,
        myColor: roomState.myColor,
        code:    roomState.code,
        skinKey: SKIN_KEYS[this.selectedSkin] ?? 'skin-klasik',
      });
    });

    s.on('lobby-reset', ({ players }: any) => {
      roomState.players.clear();
      for (const p of players) roomState.players.set(p.id, p);
      this._showPhase('waiting');
      this._renderPlayerList();
    });
  }

  /* ==============================================================
     ENTRY PANEL
  ============================================================== */
  private _buildEntryPanel() {
    const c = this.entryContainer = this.add.container(0, 0);

    /* ── BAŞLIK ── */
    this._neonTitle(c, CX, 96, '⬡  ÇOK OYUNCULU', '#ff8800', 0xff8800, '44px');

    /* ── DURUM ── */
    this.statusDot = this.add.circle(CX - 84, 154, 6, 0xffaa00, 1);
    this.statusTxt = this.add.text(CX - 72, 154, 'BAĞLANIYOR...', {
      fontSize: '17px', fontFamily: '"Orbitron",monospace', color: '#ffaa00',
    }).setOrigin(0, 0.5);
    c.add([this.statusDot, this.statusTxt]);

    /* ── HATA MESAJI ── */
    this.errorTxt = this.add.text(CX, 188, '', {
      fontSize: '17px', fontFamily: '"Orbitron",monospace', color: '#ff4466',
      align: 'center',
    }).setOrigin(0.5, 0).setAlpha(0);
    c.add(this.errorTxt);

    c.add(this._hRule(218, 0xff8800, 0.18));

    /* ── OYUNCU ADI ── */
    c.add(this._label(58, 246, 'OYUNCU ADI'));
    this.nameCounter = this.add.text(W - 58, 246, '0/8', {
      fontSize: '14px', fontFamily: '"Orbitron",monospace', color: '#443322',
    }).setOrigin(1, 0.5);
    c.add(this.nameCounter);

    /* Görsel kart (arka plan + kenarlık) */
    this.nameBorder = this.add.graphics();
    this._drawNameBorder(0xff8800, 0.5);
    c.add(this.nameBorder);

    /* Placeholder hint metni — DOM inputun üstünde, input boşken görünür */
    const hintTxt = this.add.text(CX, 304, 'ADINI GİR', {
      fontSize: '26px', fontFamily: '"Orbitron",monospace',
      color: '#553311', letterSpacing: 6,
    }).setOrigin(0.5).setName('nameHint');
    c.add(hintTxt);

    this.nameDom = this.add.dom(CX, 304, 'input', `
      width:620px; height:72px;
      background:transparent; border:none;
      color:#ff8800; font-family:"Orbitron",monospace;
      font-size:30px; font-weight:700;
      text-align:center; outline:none;
      text-transform:uppercase; letter-spacing:6px;
      padding:0; margin:0; cursor:text;
    `).setDepth(10);
    const ni = this.nameInput = this.nameDom.node as HTMLInputElement;
    ni.maxLength   = 8;
    ni.value       = localStorage.getItem(STORAGE_NAME) || '';
    this._updateCounter();
    c.add(this.nameDom);

    /* Hint metni: value boşken göster */
    const _syncHint = () => {
      hintTxt.setVisible(ni.value.length === 0);
    };
    _syncHint();
    ni.addEventListener('input',   () => { this._onNameInput(); _syncHint(); });
    ni.addEventListener('focus',   () => { hintTxt.setVisible(false); this._drawNameBorder(0xff8800, 0.9); });
    ni.addEventListener('blur',    () => { _syncHint(); this._drawNameBorder(0xff8800, 0.5); });
    ni.addEventListener('keydown', (e) => { if (e.key === 'Enter') this._doCreate(); });

    c.add(this._hRule(348, 0xff8800, 0.18));

    /* ── ROKET SEÇ ── */
    c.add(this._label(58, 372, 'ROKETİNİ SEÇ'));
    this._buildSkinSelector(c, 456);

    c.add(this._hRule(520, 0x00ffff, 0.14));

    /* ── ODA OLUŞTUR ── */
    this.createBtn = this._bigBtn(CX, 618, '◈  YENİ ODA OLUŞTUR', 0x00ffff, () => this._doCreate());
    this.createBtnLbl = this.createBtn.getByName('lbl') as Phaser.GameObjects.Text;
    c.add(this.createBtn);

    /* ── ODAYA KATIL (toggle) ── */
    this.joinArrow = this.add.text(0, 0, '▼', {
      fontSize: '18px', fontFamily: '"Orbitron",monospace', color: '#ff8800',
    }).setOrigin(0.5).setName('arrow');
    this.joinBtn = this._bigBtn(CX, 730, '⬡  ODAYA KATIL', 0xff8800, () => this._toggleJoin());
    this.joinArrow.setPosition(W / 2 + 230, 730);
    c.add(this.joinBtn);
    c.add(this.joinArrow);

    /* ── JOIN SECTION (toggle) ── */
    this.joinSection = this.add.container(0, 0);
    this.joinSection.setAlpha(0);
    c.add(this.joinSection);

    const jBg = this.add.graphics();
    jBg.fillStyle(0x06040e, 0.96);
    jBg.fillRoundedRect(60, 790, W - 120, 252, 18);
    jBg.lineStyle(2, 0xff8800, 0.45);
    jBg.strokeRoundedRect(60, 790, W - 120, 252, 18);
    jBg.lineStyle(3, 0xff8800, 0.9);
    jBg.lineBetween(80, 792, W - 80, 792);
    this.joinSection.add(jBg);

    this.joinSection.add(this.add.text(CX, 820, 'ODA KODU', {
      fontSize: '15px', fontFamily: '"Orbitron",monospace',
      color: '#553300', letterSpacing: 5,
    }).setOrigin(0.5));

    /* 5 kutu */
    const boxW = 66, boxH = 72, boxGap = 12;
    const boxTotalW = 5 * boxW + 4 * boxGap;
    const boxX0 = CX - boxTotalW / 2;
    for (let i = 0; i < 5; i++) {
      const bx = boxX0 + i * (boxW + boxGap) + boxW / 2;
      const bg = this.add.graphics();
      bg.fillStyle(0x100820, 0.9);
      bg.fillRoundedRect(bx - boxW / 2, 850, boxW, boxH, 10);
      bg.lineStyle(2, 0xff6600, 0.3);
      bg.strokeRoundedRect(bx - boxW / 2, 850, boxW, boxH, 10);
      this.joinSection.add(bg);
      this.codeBoxes.push(bg);

      const lt = this.add.text(bx, 884, '', {
        fontSize: '34px', fontFamily: '"Orbitron",monospace',
        fontStyle: 'bold', color: '#ff8800',
      }).setOrigin(0.5);
      this.joinSection.add(lt);
      this.codeLetters.push(lt);
    }

    /* Invisible wide input over the boxes */
    this.joinCodeDom = this.add.dom(CX, 884, 'input', `
      width:${boxTotalW + 20}px; height:${boxH + 10}px;
      background:transparent; border:none; outline:none;
      color:transparent; caret-color:transparent;
      font-size:1px; letter-spacing:0;
    `).setDepth(15);
    const ji = this.joinCodeInput = this.joinCodeDom.node as HTMLInputElement;
    ji.maxLength = 5;
    ji.autocomplete = 'off';
    this.joinSection.add(this.joinCodeDom);

    ji.addEventListener('input',   () => this._onCodeInput());
    ji.addEventListener('keydown', (e) => { if (e.key === 'Enter') this._doJoin(); });

    /* KATIL button inside join section */
    this.joinSection.add(
      this._smallBtn(CX, 968, '  KATIL  ', 0xff8800, () => this._doJoin()),
    );

    /* ── BACK ── */
    c.add(this._backBtn(CX, H - 80, () => {
      disconnectSocket();
      this.scene.start('StartScene');
    }));
  }

  /* ==============================================================
     WAITING PANEL
  ============================================================== */
  private _buildWaitingPanel() {
    const c = this.waitingContainer = this.add.container(0, 0);

    this._neonTitle(c, CX, 100, 'BEKLEME ODASI', '#00ffff', 0x00ffff, '40px');

    /* Kod kartı */
    const card = this.add.graphics();
    card.fillStyle(0x001520, 0.88);
    card.fillRoundedRect(CX - 290, 140, 580, 180, 22);
    card.lineStyle(2, 0x00ffff, 0.4);
    card.strokeRoundedRect(CX - 290, 140, 580, 180, 22);
    card.lineStyle(3, 0x00ffff, 1);
    card.lineBetween(CX - 268, 142, CX + 268, 142);
    c.add(card);

    c.add(this.add.text(CX, 172, 'ODA KODU', {
      fontSize: '14px', fontFamily: '"Orbitron",monospace',
      color: '#1a3344', letterSpacing: 5,
    }).setOrigin(0.5));

    this.waitCodeTxt = this.add.text(CX, 252, '─ ─ ─ ─ ─', {
      fontSize: '54px', fontFamily: '"Orbitron",monospace', fontStyle: 'bold',
      color: '#00ffff', letterSpacing: 8,
      shadow: { color: '#00ffff', blur: 22, fill: true, offsetX: 0, offsetY: 0 },
    }).setOrigin(0.5);
    c.add(this.waitCodeTxt);

    const copyBtn = this._smallBtn(CX, 352, '  ⎘  KOPYALA  ', 0x2299bb, () => {
      navigator.clipboard?.writeText(roomState.code).catch(() => {});
      const l = copyBtn.getByName('lbl') as Phaser.GameObjects.Text | null;
      l?.setText('  ✓  KOPYALANDI  ');
      this.time.delayedCall(2200, () => l?.setText('  ⎘  KOPYALA  '));
    });
    c.add(copyBtn);

    c.add(this._hRule(392, 0x00ffff, 0.13));
    c.add(this._label(58, 414, 'OYUNCULAR'));

    for (let i = 0; i < 8; i++) {
      const ry  = 444 + i * 70;
      const g   = this.add.graphics();
      g.fillStyle(0, 0);
      g.fillRoundedRect(52, ry - 26, W - 104, 52, 10);
      this.playerRowBgs.push({ g, y: ry });
      c.add(g);

      const txt = this.add.text(98, ry, '', {
        fontSize: '24px', fontFamily: '"Orbitron",monospace',
        fontStyle: 'bold', color: '#1a2533',
      }).setOrigin(0, 0.5);
      this.playerListTxts.push(txt);
      c.add(txt);
    }

    c.add(this._hRule(1012, 0x00ffff, 0.13));

    this.startBtn = this._bigBtn(CX, 1104, '▶  OYUNU BAŞLAT', 0x00ff88, () => {
      getSocket().emit('start-game');
    });
    c.add(this.startBtn);
    this.startBtnLabel = this.startBtn.getByName('lbl') as Phaser.GameObjects.Text;

    c.add(this._backBtn(CX, H - 80, () => {
      disconnectSocket();
      this.scene.start('StartScene');
    }));
  }

  /* ==============================================================
     RESULTS PANEL
  ============================================================== */
  private _buildResultsPanel() {
    const c = this.resultsContainer = this.add.container(0, 0);

    this._neonTitle(c, CX, 96, '🏆  SONUÇLAR', '#ffcc00', 0xffcc00, '48px');
    c.add(this._hRule(148, 0xffaa00, 0.25));

    const ROW_H = 82, GAP = 8, Y0 = 170;
    for (let i = 0; i < 8; i++) {
      const ry = Y0 + i * (ROW_H + GAP);

      const bg = this.add.graphics();
      const cols = [0x241600, 0x0e141a, 0x0b1009, 0x070b10];
      bg.fillStyle(cols[Math.min(i, 3)], 0.88);
      bg.fillRoundedRect(44, ry, W - 88, ROW_H, 14);
      if (i < 3) {
        const bc = [0xffcc00, 0x99aacc, 0xbb6622];
        bg.lineStyle(i === 0 ? 2 : 1, bc[i], i === 0 ? 0.75 : 0.35);
        bg.strokeRoundedRect(44, ry, W - 88, ROW_H, 14);
      }
      c.add(bg);

      const rank = this.add.text(84, ry + ROW_H / 2, '', {
        fontSize: i === 0 ? '28px' : '22px', fontFamily: '"Orbitron",monospace',
      }).setOrigin(0, 0.5);
      c.add(rank);
      this.resultsRankTxts.push(rank);

      const name = this.add.text(162, ry + ROW_H / 2, '', {
        fontSize: i === 0 ? '26px' : '22px', fontFamily: '"Orbitron",monospace',
        fontStyle: 'bold', color: '#ffffff',
      }).setOrigin(0, 0.5);
      c.add(name);
      this.resultsNameTxts.push(name);

      const score = this.add.text(W - 60, ry + ROW_H / 2, '', {
        fontSize: i === 0 ? '26px' : '22px', fontFamily: '"Orbitron",monospace',
        fontStyle: 'bold', color: '#ffffff',
      }).setOrigin(1, 0.5);
      c.add(score);
      this.resultsScoreTxts.push(score);
    }

    c.add(this._hRule(Y0 + 8 * (ROW_H + GAP) + 4, 0xffaa00, 0.15));

    c.add(this._bigBtn(CX, 1128, '↩  LOBİYE DÖN', 0x00ffff, () => {
      getSocket().emit('return-to-lobby');
      this._showPhase('waiting');
    }));

    c.add(this._backBtn(CX, 1260, () => {
      disconnectSocket();
      this.scene.start('StartScene');
    }));
  }

  /* ==============================================================
     RENDER HELPERS
  ============================================================== */
  private _renderResults(results: any[]) {
    for (let i = 0; i < this.resultsNameTxts.length; i++) {
      const r = results[i];
      if (!r) {
        this.resultsRankTxts[i].setText('');
        this.resultsNameTxts[i].setText('');
        this.resultsScoreTxts[i].setText('');
        continue;
      }
      const isMe  = r.id === roomState.myId;
      const medal = i < 3 ? MEDAL_ICONS[i] : `${i + 1}.`;
      const col   = i < 3 ? MEDAL_COLORS[i] : colorHex(r.color);

      this.resultsRankTxts[i].setText(medal);
      this.resultsNameTxts[i].setText(r.name + (isMe ? '  ◄' : ''));
      this.resultsNameTxts[i].setStyle({ color: col });
      this.resultsScoreTxts[i].setText(String(Math.floor(r.score)));
      this.resultsScoreTxts[i].setStyle({ color: col });
    }
    roomState.results = results;
  }

  private _renderPlayerList() {
    const players = [...roomState.players.values()];
    const me      = roomState.players.get(roomState.myId);
    const amHost  = me?.isHost ?? false;

    for (let i = 0; i < this.playerListTxts.length; i++) {
      const p  = players[i];
      const rb = this.playerRowBgs[i];

      rb.g.clear();
      if (!p) {
        this.playerListTxts[i].setText('');
        continue;
      }

      const hex = colorHex(p.color);
      this.playerListTxts[i].setText(
        `■  ${p.name}${p.isHost ? '  👑' : ''}${p.id === roomState.myId ? '  ◄' : ''}`,
      );
      this.playerListTxts[i].setStyle({ color: hex });

      rb.g.fillStyle(p.color, 0.06);
      rb.g.fillRoundedRect(52, rb.y - 26, W - 104, 52, 10);
      rb.g.lineStyle(1, p.color, 0.24);
      rb.g.strokeRoundedRect(52, rb.y - 26, W - 104, 52, 10);
    }

    this.startBtn?.setVisible(amHost);
    if (amHost) {
      const ok = players.length >= 1;
      this.startBtnLabel?.setStyle({ color: ok ? '#001800' : '#223322' });
      this.startBtn?.setAlpha(ok ? 1 : 0.40);
    }
  }

  private _showPhase(ph: 'entry' | 'waiting' | 'results') {
    this.phase = ph;
    this.entryContainer?.setVisible(ph === 'entry');
    this.waitingContainer?.setVisible(ph === 'waiting');
    this.resultsContainer?.setVisible(ph === 'results');

    /* DOM elements must be explicitly hidden when not in entry */
    if (this.nameDom)     this.nameDom.setVisible(ph === 'entry');
    if (this.joinCodeDom) this.joinCodeDom.setVisible(ph === 'entry' && this.joinOpen);
  }

  /* ==============================================================
     ENTRY ACTIONS
  ============================================================== */
  private _doCreate() {
    const name = this._getValidName();
    if (!name) return;
    localStorage.setItem(STORAGE_NAME, name);
    this.createBtnLbl?.setText('OLUŞTURULUYOR...');
    getSocket().emit('create-room', { name, skin: SKIN_KEYS[this.selectedSkin] });
  }

  private _doJoin() {
    const name = this._getValidName();
    if (!name) return;
    const code = this.joinCodeInput.value.toUpperCase().trim();
    if (code.length < 5) {
      this._showError('5 KARAKTER GEREKLİ');
      this._shakeCodeBoxes();
      return;
    }
    localStorage.setItem(STORAGE_NAME, name);
    getSocket().emit('join-room', { code, name, skin: SKIN_KEYS[this.selectedSkin] });
  }

  private _getValidName(): string | null {
    const name = this.nameInput.value.toUpperCase().trim();
    if (name.length < 2) {
      this._showError('EN AZ 2 KARAKTER GİR');
      this._shakeNameInput();
      return null;
    }
    return name;
  }

  private _resetCreateBtn() {
    this.createBtnLbl?.setText('◈  YENİ ODA OLUŞTUR');
  }

  private _toggleJoin() {
    this.joinOpen = !this.joinOpen;
    this.tweens.add({
      targets: this.joinSection,
      alpha: this.joinOpen ? 1 : 0,
      duration: 180, ease: 'Sine.easeOut',
    });
    this.joinArrow.setText(this.joinOpen ? '▲' : '▼');
    if (this.joinCodeDom) {
      this.joinCodeDom.setVisible(this.joinOpen);
    }
    if (this.joinOpen) {
      this.time.delayedCall(200, () => this.joinCodeInput?.focus());
    }
  }

  /* ==============================================================
     INPUT HANDLERS
  ============================================================== */
  private _onNameInput() {
    const v = this.nameInput.value.toUpperCase();
    this.nameInput.value = v;
    this._updateCounter();
    /* Reset border color */
    this._drawNameBorder(0xff8800, 0.45);
    this.errorTxt?.setAlpha(0);
  }

  private _onCodeInput() {
    const v = this.joinCodeInput.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    this.joinCodeInput.value = v;
    this._updateCodeBoxes(v);
  }

  private _updateCounter() {
    const len = this.nameInput.value.length;
    this.nameCounter?.setText(`${len}/8`);
    this.nameCounter?.setStyle({ color: len >= 7 ? '#ff8800' : '#443322' });
  }

  private _updateCodeBoxes(val: string) {
    for (let i = 0; i < 5; i++) {
      const ch = val[i] ?? '';
      this.codeLetters[i]?.setText(ch);

      this.codeBoxes[i]?.clear();
      const filled = ch !== '';
      this.codeBoxes[i]?.fillStyle(filled ? 0x1a0d00 : 0x100820, 0.9);
      this.codeBoxes[i]?.fillRoundedRect(
        this._codeBoxX(i) - 33, 850, 66, 72, 10,
      );
      this.codeBoxes[i]?.lineStyle(2,
        filled ? 0xff8800 : 0xff6600,
        filled ? 0.9 : 0.3,
      );
      this.codeBoxes[i]?.strokeRoundedRect(
        this._codeBoxX(i) - 33, 850, 66, 72, 10,
      );
    }
  }

  private _codeBoxX(i: number): number {
    const boxW = 66, boxGap = 12;
    return CX - (5 * boxW + 4 * boxGap) / 2 + i * (boxW + boxGap) + boxW / 2;
  }

  /* ==============================================================
     FEEDBACK / ANIMATION
  ============================================================== */
  private _showError(msg: string) {
    this.errorTimer?.remove();
    this.errorTxt?.setText(msg).setAlpha(1);
    this._drawNameBorder(0xff4466, 0.8);
    this.errorTimer = this.time.delayedCall(3200, () => {
      this.tweens.add({
        targets: this.errorTxt, alpha: 0, duration: 400,
        onComplete: () => this._drawNameBorder(0xff8800, 0.45),
      });
    });
  }

  private _shakeNameInput() {
    this._drawNameBorder(0xff4466, 0.9);
    const ox = this.nameDom.x;
    this.tweens.add({
      targets: this.nameDom, x: ox + 12,
      duration: 40, yoyo: true, repeat: 3, ease: 'Linear',
      onComplete: () => { this.nameDom.x = ox; },
    });
  }

  private _shakeCodeBoxes() {
    this.tweens.add({
      targets: this.joinSection, x: 10,
      duration: 40, yoyo: true, repeat: 3, ease: 'Linear',
      onComplete: () => { this.joinSection.x = 0; },
    });
  }

  private _drawNameBorder(col: number, alpha: number) {
    this.nameBorder?.clear();
    /* Kart arka planı */
    this.nameBorder?.fillStyle(0x0c0818, 0.85);
    this.nameBorder?.fillRoundedRect(78, 272, W - 156, 72, 12);
    /* Kenarlık */
    this.nameBorder?.lineStyle(2, col, alpha);
    this.nameBorder?.strokeRoundedRect(78, 272, W - 156, 72, 12);
    /* Üst vurgu çizgisi */
    this.nameBorder?.lineStyle(3, col, Math.min(1, alpha * 1.6));
    this.nameBorder?.lineBetween(96, 273.5, W - 96, 273.5);
  }

  /* ==============================================================
     SKIN SELECTOR
  ============================================================== */
  private _buildSkinSelector(c: Phaser.GameObjects.Container, cy: number) {
    const sp = 150, x0 = CX - sp * 1.5;
    for (let i = 0; i < 4; i++) {
      const x = x0 + i * sp;

      const bg = this.add.graphics();
      bg.fillStyle(0x080412, 0.75);
      bg.fillRoundedRect(x - 47, cy - 47, 94, 94, 14);
      c.add(bg);

      const bdr = this.add.rectangle(x, cy, 94, 94, 0, 0).setStrokeStyle(
        i === this.selectedSkin ? 3 : 1.5,
        i === this.selectedSkin ? 0xff8800 : 0x331800, 1,
      );
      this.skinBorders.push(bdr);
      c.add(bdr);

      const img = this.add.image(x, cy, SKIN_KEYS[i])
        .setDisplaySize(64, 76)
        .setAlpha(i === this.selectedSkin ? 1 : 0.28);
      this.skinFrames.push(img);
      c.add(img);

      bdr.setInteractive({ useHandCursor: true }).on('pointerdown', () => this._selectSkin(i));
      img.setInteractive({ useHandCursor: true }).on('pointerdown', () => this._selectSkin(i));
    }
  }

  private _selectSkin(i: number) {
    this.selectedSkin = i;
    for (let j = 0; j < 4; j++) {
      const sel = j === i;
      this.skinBorders[j]?.setStrokeStyle(sel ? 3 : 1.5, sel ? 0xff8800 : 0x331800, 1);
      this.skinFrames[j]?.setAlpha(sel ? 1 : 0.28);
    }
    localStorage.setItem(STORAGE_SKIN, String(i));
  }

  /* ==============================================================
     BACKGROUND
  ============================================================== */
  private _drawGrid() {
    const g = this.add.graphics();
    const vY = H * 0.52;
    for (let i = 0; i <= 10; i++) {
      const t = (i / 10) ** 1.8;
      const y = vY + (H - vY) * t;
      g.lineStyle(2, 0x00aaff, 0.05 + t * 0.14);
      g.lineBetween(0, y, W, y);
    }
    for (let i = 0; i <= 12; i++) {
      const bx = (i / 12) * W;
      g.lineStyle(2, 0x00aaff, 0.05 + 0.08 * Math.abs(i - 6) / 6);
      g.lineBetween(CX, vY, bx, H);
    }
    g.lineStyle(1, 0x001428, 0.18);
    for (let x = 0; x <= W; x += 80) g.lineBetween(x, 0, x, vY);
    for (let y = 0; y <= vY; y += 80) g.lineBetween(0, y, W, y);
  }

  private _drawStars() {
    const pal = [0xffffff, 0x00ffff, 0xff2060, 0xffcc00, 0x8844ff];
    for (let i = 0; i < 80; i++) {
      const x   = Phaser.Math.Between(0, W);
      const y   = Phaser.Math.Between(0, H * 0.52);
      const r   = Math.random() * 2.4 + 0.4;
      const col = pal[Math.floor(Math.random() * pal.length)];
      const a   = Math.random() * 0.48 + 0.06;
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

  /* ==============================================================
     BUTTON & LAYOUT HELPERS
  ============================================================== */
  private _bigBtn(
    x: number, y: number, label: string, col: number, cb: () => void,
  ): Phaser.GameObjects.Container {
    const bw = 640, bh = 88;
    const bg = this.add.graphics();
    const draw = (a: number) => {
      bg.clear(); bg.fillStyle(col, a);
      bg.fillRoundedRect(-bw / 2, -bh / 2, bw, bh, 16);
    };
    draw(0.08);

    const bdr = this.add.graphics();
    bdr.lineStyle(2, col, 0.8);
    bdr.strokeRoundedRect(-bw / 2, -bh / 2, bw, bh, 16);

    const top = this.add.graphics();
    top.lineStyle(3, col, 1);
    top.lineBetween(-bw / 2 + 20, -bh / 2 + 1.5, bw / 2 - 20, -bh / 2 + 1.5);

    const lbl = this.add.text(0, 0, label, {
      fontSize: '28px', fontFamily: '"Orbitron",monospace', fontStyle: 'bold',
      color: colorHex(col),
      shadow: { color: colorHex(col), blur: 12, fill: false, stroke: true, offsetX: 0, offsetY: 0 },
    }).setOrigin(0.5).setName('lbl');

    const hit = this.add.rectangle(0, 0, bw, bh, 0, 0)
      .setInteractive({ useHandCursor: true });
    hit.on('pointerover', () => draw(0.18));
    hit.on('pointerout',  () => draw(0.08));
    hit.on('pointerdown', () => {
      this.tweens.add({
        targets: [bdr, lbl], scaleX: 0.97, scaleY: 0.97,
        duration: 55, yoyo: true, onComplete: cb,
      });
    });

    return this.add.container(x, y, [bg, bdr, top, lbl, hit]);
  }

  private _smallBtn(
    x: number, y: number, label: string, col: number, cb: () => void,
  ): Phaser.GameObjects.Container {
    const bw = 280, bh = 62;
    const bg = this.add.graphics();
    const draw = (a: number) => {
      bg.clear(); bg.fillStyle(col, a);
      bg.fillRoundedRect(-bw / 2, -bh / 2, bw, bh, 12);
    };
    draw(0.10);

    const bdr = this.add.graphics();
    bdr.lineStyle(2, col, 0.65);
    bdr.strokeRoundedRect(-bw / 2, -bh / 2, bw, bh, 12);
    const top = this.add.graphics();
    top.lineStyle(2, col, 0.85);
    top.lineBetween(-bw / 2 + 14, -bh / 2 + 1, bw / 2 - 14, -bh / 2 + 1);

    const lbl = this.add.text(0, 0, label, {
      fontSize: '22px', fontFamily: '"Orbitron",monospace',
      fontStyle: 'bold', color: colorHex(col),
    }).setOrigin(0.5).setName('lbl');

    const hit = this.add.rectangle(0, 0, bw, bh, 0, 0)
      .setInteractive({ useHandCursor: true });
    hit.on('pointerover', () => draw(0.22));
    hit.on('pointerout',  () => draw(0.10));
    hit.on('pointerdown', cb);

    return this.add.container(x, y, [bg, bdr, top, lbl, hit]);
  }

  private _backBtn(x: number, y: number, cb: () => void) {
    const t = this.add.text(x, y, '←  ANA MENÜ', {
      fontSize: '20px', fontFamily: '"Orbitron",monospace',
      color: '#2a3a44', letterSpacing: 2,
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    t.on('pointerover', () => t.setStyle({ color: '#55778a' }));
    t.on('pointerout',  () => t.setStyle({ color: '#2a3a44' }));
    t.on('pointerdown', cb);
    return t;
  }

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
    g.lineBetween(52, y, W - 52, y);
    g.fillStyle(col, Math.min(1, alpha * 1.9));
    g.fillRect(CX - 4, y - 4, 8, 8);
    return g;
  }

  private _label(x: number, y: number, txt: string) {
    return this.add.text(x, y, txt, {
      fontSize: '14px', fontFamily: '"Orbitron",monospace',
      color: '#2a3a44', letterSpacing: 4,
    }).setOrigin(0, 0.5);
  }
}
