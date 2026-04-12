/* =========================================================
   MULTI LOBBY SCENE
   Aşamalar: 'entry' → 'waiting' → (GameScene) → 'results'
   ========================================================= */

import Phaser from 'phaser';
import {
  getSocket, disconnectSocket, roomState, colorHex, SKIN_KEYS,
} from '../multiState';
import { GAME_WIDTH, GAME_HEIGHT, COLOR_BG } from '../constants';
import { STORAGE_SKIN } from '../constants';
import { t } from '../i18n';

const W = GAME_WIDTH;
const H = GAME_HEIGHT;
const CX = W / 2;

const MEDALS = ['🥇', '🥈', '🥉'];

export class MultiLobbyScene extends Phaser.Scene {
  private phase: 'entry' | 'waiting' | 'results' = 'entry';

  /* Phase containers */
  private entryContainer!:   Phaser.GameObjects.Container;
  private waitingContainer!: Phaser.GameObjects.Container;
  private resultsContainer!: Phaser.GameObjects.Container;

  /* Name input */
  private nameDom!:    Phaser.GameObjects.DOMElement;
  private nameInput!:  HTMLInputElement;

  /* Skin */
  private selectedSkin = 0;
  private skinFrames:  Phaser.GameObjects.Image[] = [];
  private skinBorders: Phaser.GameObjects.Rectangle[] = [];

  /* Entry - kod giriş */
  private joinCodeDom!:  Phaser.GameObjects.DOMElement;
  private joinCodeInput!: HTMLInputElement;
  private joinPanel!: Phaser.GameObjects.Container;

  /* Status text */
  private statusTxt!: Phaser.GameObjects.Text;

  /* Waiting panel */
  private playerListTxts: Phaser.GameObjects.Text[] = [];
  private startBtn!: Phaser.GameObjects.Container;
  private waitCodeTxt!: Phaser.GameObjects.Text;
  private startBtnLabel!: Phaser.GameObjects.Text;

  /* Results panel */
  private resultsListTxts: Phaser.GameObjects.Text[] = [];

  /* Scene data */
  private incomingResults?: any[];

  constructor() { super({ key: 'MultiLobbyScene' }); }

  init(data: any) {
    if (data?.phase === 'results' && data?.results) {
      this.phase = 'results';
      this.incomingResults = data.results;
    } else if (data?.phase === 'waiting') {
      this.phase = 'waiting';
    } else {
      this.phase = 'entry';
    }
  }

  create() {
    /* Arkaplan */
    this.add.rectangle(CX, H / 2, W, H, COLOR_BG);
    this._createGrid();

    /* Load saved skin */
    this.selectedSkin = parseInt(localStorage.getItem(STORAGE_SKIN) || '0', 10);

    /* Build panels */
    this._buildEntryPanel();
    this._buildWaitingPanel();
    this._buildResultsPanel();

    /* Socket events */
    this._bindSocket();

    /* Show correct phase */
    this._showPhase(this.phase);
    if (this.phase === 'results' && this.incomingResults) {
      this._renderResults(this.incomingResults);
    }
    if (this.phase === 'waiting') {
      this._renderPlayerList();
    }
  }

  shutdown() {
    const s = getSocket();
    s.off('room-created');
    s.off('room-joined');
    s.off('room-error');
    s.off('player-joined');
    s.off('player-left');
    s.off('game-starting');
    s.off('game-over');
    s.off('lobby-reset');
    /* DOM elementlerini temizle */
    this.nameDom?.destroy();
    this.joinCodeDom?.destroy();
  }

  /* --------------------------------------------------------
     SOCKEt EVENT BAĞLAMA
  -------------------------------------------------------- */
  private _bindSocket() {
    const s = getSocket();

    s.on('room-created', ({ code, myId, myColor, players }: any) => {
      roomState.code = code;
      roomState.myId = myId;
      roomState.myColor = myColor;
      roomState.players.clear();
      for (const p of players) roomState.players.set(p.id, p);
      this._showPhase('waiting');
      this._renderPlayerList();
      this.waitCodeTxt.setText(code);
    });

    s.on('room-joined', ({ code, myId, myColor, players }: any) => {
      roomState.code = code;
      roomState.myId = myId;
      roomState.myColor = myColor;
      roomState.players.clear();
      for (const p of players) roomState.players.set(p.id, p);
      this._showPhase('waiting');
      this._renderPlayerList();
      this.waitCodeTxt.setText(code);
    });

    s.on('room-error', ({ msg }: any) => {
      this.statusTxt.setText('⚠ ' + msg);
      this.statusTxt.setStyle({ color: '#ff4466' });
      this.time.delayedCall(3000, () => {
        this.statusTxt.setText('Sunucuya bağlanılıyor...');
        this.statusTxt.setStyle({ color: '#446655' });
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
      const skinKey = SKIN_KEYS[this.selectedSkin] ?? 'skin-klasik';
      this.scene.start('GameScene', {
        skin: this.selectedSkin,
        multi: true,
        myId: roomState.myId,
        myColor: roomState.myColor,
        code: roomState.code,
        skinKey,
      });
    });

    s.on('game-over', ({ results }: { results: any[] }) => {
      /* GameScene zaten bu eventi dinliyor, ama buraya da geliyor
         eğer lobby açıkken gelirse atla */
    });

    s.on('lobby-reset', ({ players }: any) => {
      roomState.players.clear();
      for (const p of players) roomState.players.set(p.id, p);
      this._showPhase('waiting');
      this._renderPlayerList();
    });
  }

  /* --------------------------------------------------------
     ENTRY PANEL  — premium redesign
  -------------------------------------------------------- */
  private _buildEntryPanel() {
    const c = this.add.container(0, 0);
    this.entryContainer = c;

    /* ── Başlık ── */
    c.add(this.add.text(CX, 110, '⬡  ÇOK OYUNCULU', {
      fontSize: '46px', fontFamily: '"Orbitron", monospace', fontStyle: 'bold',
      color: '#ff8800',
      stroke: '#3a1800', strokeThickness: 4,
      shadow: { color: '#ff7700', blur: 28, stroke: true, fill: false, offsetX: 0, offsetY: 0 },
    }).setOrigin(0.5));

    /* Durum satırı */
    this.statusTxt = this.add.text(CX, 178, 'Sunucuya bağlanılıyor...', {
      fontSize: '20px', fontFamily: 'monospace', color: '#55443a',
    }).setOrigin(0.5).setDepth(1);
    c.add(this.statusTxt);

    /* Ayırıcı */
    const div1 = this.add.graphics();
    div1.lineStyle(1, 0xff7700, 0.18);
    div1.lineBetween(CX - 320, 210, CX + 320, 210);
    c.add(div1);

    /* ── Ad girişi ── */
    c.add(this.add.text(CX - 140, 248, 'OYUNCU ADI', {
      fontSize: '16px', fontFamily: 'monospace',
      color: '#664422', letterSpacing: 3,
    }).setOrigin(0, 0.5));

    this.nameDom = this.add.dom(CX, 296, 'input', `
      width:300px; height:58px;
      background:#0d0e1c; border:none;
      border-bottom:2px solid #ff7700;
      color:#ff8800; font-family:monospace; font-size:30px;
      text-align:center; outline:none; text-transform:uppercase;
      letter-spacing:4px;
    `).setDepth(5);
    this.nameInput = this.nameDom.node as HTMLInputElement;
    this.nameInput.maxLength = 8;
    this.nameInput.placeholder = 'ADI';
    c.add(this.nameDom);

    /* ── Skin seçici ── */
    const div2 = this.add.graphics();
    div2.lineStyle(1, 0xff7700, 0.18);
    div2.lineBetween(CX - 320, 340, CX + 320, 340);
    c.add(div2);

    c.add(this.add.text(CX - 140, 368, 'ROKETİNİ SEÇ', {
      fontSize: '16px', fontFamily: 'monospace', color: '#664422', letterSpacing: 3,
    }).setOrigin(0, 0.5));

    const skinSpacing = 148;
    const skinStartX  = CX - skinSpacing * 1.5;
    for (let i = 0; i < 4; i++) {
      const sx = skinStartX + i * skinSpacing;
      const sy = 448;

      /* Arka plan kartı */
      const bg = this.add.graphics();
      bg.fillStyle(0x100a04, 0.6);
      bg.fillRoundedRect(sx - 44, sy - 44, 88, 88, 14);
      c.add(bg);

      /* Seçim çerçevesi */
      const border = this.add.rectangle(sx, sy, 88, 88, 0, 0)
        .setStrokeStyle(i === this.selectedSkin ? 3 : 1.5,
                         i === this.selectedSkin ? 0xff7700 : 0x332211, 1);
      this.skinBorders.push(border);
      c.add(border);

      /* Roket görseli */
      const img = this.add.image(sx, sy, SKIN_KEYS[i])
        .setDisplaySize(62, 72).setAlpha(i === this.selectedSkin ? 1 : 0.35);
      this.skinFrames.push(img);
      c.add(img);

      /* Seçim glow halesi */
      const glow = this.add.graphics();
      glow.lineStyle(12, 0xff7700, 0.08);
      glow.strokeRoundedRect(sx - 52, sy - 52, 104, 104, 18);
      glow.setAlpha(i === this.selectedSkin ? 1 : 0);
      c.add(glow);
      (border as any).__glow = glow;

      border.setInteractive({ useHandCursor: true });
      border.on('pointerdown', () => this._selectSkin(i));
      img.setInteractive({ useHandCursor: true });
      img.on('pointerdown', () => this._selectSkin(i));
    }

    const div3 = this.add.graphics();
    div3.lineStyle(1, 0xff7700, 0.18);
    div3.lineBetween(CX - 320, 515, CX + 320, 515);
    c.add(div3);

    /* ── Aksiyon butonları ── */
    const createBtn = this._makeBtn(CX, 600, '◈  ODA OLUŞTUR', 0x00e5ff, () => {
      const name = this.nameInput.value.toUpperCase().trim() || 'PLAYER';
      const skin = SKIN_KEYS[this.selectedSkin];
      getSocket().emit('create-room', { name, skin });
    }, { w: 620, h: 84, fontSize: '28px' });
    c.add(createBtn);

    const joinBtn = this._makeBtn(CX, 712, '⬡  ODAYA GİR', 0xff7700, () => {
      this.joinPanel.setVisible(true);
      this.joinCodeInput.focus();
    }, { w: 620, h: 84, fontSize: '28px' });
    c.add(joinBtn);

    /* ── JOIN kod paneli (overlay) ── */
    this.joinPanel = this.add.container(0, 0);
    this.joinPanel.setVisible(false);
    c.add(this.joinPanel);

    /* Karartma arka planı */
    const overlay = this.add.rectangle(CX, H / 2, W, H, 0x000000, 0.72);
    this.joinPanel.add(overlay);

    /* Panel kartı */
    const panelCard = this.add.graphics();
    panelCard.fillStyle(0x0a0812, 0.98);
    panelCard.fillRoundedRect(CX - 280, 480, 560, 340, 24);
    panelCard.lineStyle(2, 0xff7700, 0.7);
    panelCard.strokeRoundedRect(CX - 280, 480, 560, 340, 24);
    panelCard.lineStyle(3, 0xff7700, 1);
    panelCard.lineBetween(CX - 256, 482, CX + 256, 482);
    this.joinPanel.add(panelCard);

    this.joinPanel.add(this.add.text(CX, 524, 'ODA KODUNU GİR', {
      fontSize: '22px', fontFamily: '"Orbitron", monospace',
      fontStyle: 'bold', color: '#ff8800', letterSpacing: 3,
    }).setOrigin(0.5));

    this.joinCodeDom = this.add.dom(CX, 614, 'input', `
      width:220px; height:60px;
      background:transparent; border:none;
      border-bottom:3px solid #ff7700;
      color:#ff8800; font-family:"Orbitron", monospace;
      font-size:38px; text-align:center; outline:none;
      text-transform:uppercase; letter-spacing:8px;
    `).setDepth(10);
    this.joinCodeInput = this.joinCodeDom.node as HTMLInputElement;
    this.joinCodeInput.maxLength = 5;
    this.joinCodeInput.placeholder = 'XXXXX';
    this.joinPanel.add(this.joinCodeDom);

    const katil = this._makeBtn(CX - 130, 730, 'KATIL', 0xff7700, () => {
      const code = this.joinCodeInput.value.toUpperCase().trim();
      const name = this.nameInput.value.toUpperCase().trim() || 'PLAYER';
      const skin = SKIN_KEYS[this.selectedSkin];
      if (code.length < 3) return;
      getSocket().emit('join-room', { code, name, skin });
    }, { w: 210, h: 68 });
    this.joinPanel.add(katil);

    const iptal = this._makeBtn(CX + 130, 730, 'İPTAL', 0x667799, () => {
      this.joinPanel.setVisible(false);
    }, { w: 210, h: 68 });
    this.joinPanel.add(iptal);

    /* ── Geri ── */
    c.add(this._makeBtn(CX, H - 100, '← ANA MENÜ', 0x998866, () => {
      disconnectSocket();
      this.scene.start('StartScene');
    }, { w: 320, h: 58, fontSize: '20px' }));
  }

  /* --------------------------------------------------------
     WAITING PANEL — premium redesign
  -------------------------------------------------------- */
  private _buildWaitingPanel() {
    const c = this.add.container(0, 0);
    this.waitingContainer = c;

    /* ── Başlık ── */
    c.add(this.add.text(CX, 92, 'BEKLEME ODASI', {
      fontSize: '40px', fontFamily: '"Orbitron", monospace', fontStyle: 'bold',
      color: '#00e5ff',
      stroke: '#003344', strokeThickness: 3,
      shadow: { color: '#00ffff', blur: 22, stroke: true, fill: false, offsetX: 0, offsetY: 0 },
    }).setOrigin(0.5));

    /* ── Kod bloğu ── */
    const codeCardG = this.add.graphics();
    codeCardG.fillStyle(0x001a22, 0.8);
    codeCardG.fillRoundedRect(CX - 280, 130, 560, 160, 20);
    codeCardG.lineStyle(2, 0x00e5ff, 0.5);
    codeCardG.strokeRoundedRect(CX - 280, 130, 560, 160, 20);
    codeCardG.lineStyle(3, 0x00e5ff, 1);
    codeCardG.lineBetween(CX - 256, 132, CX + 256, 132);
    c.add(codeCardG);

    c.add(this.add.text(CX, 158, 'ODA KODU', {
      fontSize: '16px', fontFamily: 'monospace', color: '#225566', letterSpacing: 4,
    }).setOrigin(0.5));

    this.waitCodeTxt = this.add.text(CX, 224, '- - - - -', {
      fontSize: '60px', fontFamily: '"Orbitron", monospace', fontStyle: 'bold',
      color: '#00e5ff', letterSpacing: 8,
      shadow: { color: '#00ffff', blur: 18, stroke: false, fill: true, offsetX: 0, offsetY: 0 },
    }).setOrigin(0.5);
    c.add(this.waitCodeTxt);

    /* Kopyala butonu */
    const copyBtn = this._makeBtn(CX, 312, '⎘  KOPYALA', 0x2299bb, () => {
      navigator.clipboard?.writeText(roomState.code).catch(() => {});
      (copyBtn.getByName('label') as Phaser.GameObjects.Text | null)?.setText('✓  KOPYALANDI');
      this.time.delayedCall(2000, () =>
        (copyBtn.getByName('label') as Phaser.GameObjects.Text | null)?.setText('⎘  KOPYALA'));
    }, { w: 220, h: 52, fontSize: '20px' });
    c.add(copyBtn);

    /* ── Oyuncu listesi ── */
    const div = this.add.graphics();
    div.lineStyle(1, 0x00e5ff, 0.15);
    div.lineBetween(CX - 300, 352, CX + 300, 352);
    c.add(div);

    c.add(this.add.text(60, 372, 'OYUNCULAR', {
      fontSize: '15px', fontFamily: 'monospace', color: '#224433', letterSpacing: 3,
    }));

    for (let i = 0; i < 8; i++) {
      const rowY = 408 + i * 72;
      /* Satır arka planı */
      const rowBg = this.add.graphics();
      rowBg.fillStyle(0x001a0f, 0.0);
      rowBg.fillRoundedRect(50, rowY - 26, W - 100, 52, 10);
      c.add(rowBg);

      const txt = this.add.text(90, rowY, '', {
        fontSize: '26px', fontFamily: 'monospace', color: '#1a3322',
      }).setOrigin(0, 0.5);
      this.playerListTxts.push(txt);
      c.add(txt);
    }

    const div2 = this.add.graphics();
    div2.lineStyle(1, 0x00e5ff, 0.15);
    div2.lineBetween(CX - 300, 990, CX + 300, 990);
    c.add(div2);

    /* ── Başlat butonu ── */
    this.startBtn = this._makeBtn(CX, 1088, '▶  OYUNU BAŞLAT', 0x00ff88, () => {
      getSocket().emit('start-game');
    }, { w: 640, h: 90, fontSize: '30px' });
    c.add(this.startBtn);
    this.startBtnLabel = this.startBtn.getByName('label') as Phaser.GameObjects.Text;

    /* ── Çık ── */
    c.add(this._makeBtn(CX, H - 100, '← ÇIKIŞ', 0x7766aa, () => {
      disconnectSocket();
      this.scene.start('StartScene');
    }, { w: 320, h: 58, fontSize: '20px' }));
  }

  /* --------------------------------------------------------
     RESULTS PANEL — premium redesign
  -------------------------------------------------------- */
  private _buildResultsPanel() {
    const c = this.add.container(0, 0);
    this.resultsContainer = c;

    /* ── Başlık ── */
    c.add(this.add.text(CX, 100, '🏆  SONUÇLAR', {
      fontSize: '50px', fontFamily: '"Orbitron", monospace', fontStyle: 'bold',
      color: '#ffcc00', stroke: '#443300', strokeThickness: 3,
      shadow: { color: '#ffaa00', blur: 28, stroke: true, fill: false, offsetX: 0, offsetY: 0 },
    }).setOrigin(0.5));

    const divTop = this.add.graphics();
    divTop.lineStyle(1, 0xffaa00, 0.25);
    divTop.lineBetween(CX - 300, 148, CX + 300, 148);
    c.add(divTop);

    /* ── Sıralama satırları ── */
    const ROW_H   = 84;
    const ROW_PAD = 8;
    const ROW_Y0  = 175;
    for (let i = 0; i < 8; i++) {
      const ry = ROW_Y0 + i * (ROW_H + ROW_PAD);
      /* Satır kart arka planı */
      const rowG = this.add.graphics();
      if (i === 0) {
        rowG.fillStyle(0x2a1800, 0.9);
      } else if (i === 1) {
        rowG.fillStyle(0x151a20, 0.9);
      } else if (i === 2) {
        rowG.fillStyle(0x0e140e, 0.9);
      } else {
        rowG.fillStyle(0x080c14, 0.7);
      }
      rowG.fillRoundedRect(50, ry, W - 100, ROW_H, 14);
      if (i < 3) {
        const borderCols = [0xffcc00, 0xaabccc, 0xcc7733];
        rowG.lineStyle(2, borderCols[i], 0.6);
        rowG.strokeRoundedRect(50, ry, W - 100, ROW_H, 14);
      }
      c.add(rowG);

      const txt = this.add.text(CX, ry + ROW_H / 2, '', {
        fontSize: i === 0 ? '30px' : '26px',
        fontFamily: 'monospace',
        color: '#ffffff',
      }).setOrigin(0.5);
      this.resultsListTxts.push(txt);
      c.add(txt);
    }

    const divBot = this.add.graphics();
    divBot.lineStyle(1, 0xffaa00, 0.15);
    divBot.lineBetween(CX - 300, 1060, CX + 300, 1060);
    c.add(divBot);

    /* ── Butonlar ── */
    c.add(this._makeBtn(CX, 1150, '↩  LOBİYE DÖN', 0x00e5ff, () => {
      getSocket().emit('return-to-lobby');
      this._showPhase('waiting');
    }, { w: 560, h: 84, fontSize: '28px' }));

    c.add(this._makeBtn(CX, 1268, '← ANA MENÜ', 0x7766aa, () => {
      disconnectSocket();
      this.scene.start('StartScene');
    }, { w: 400, h: 64, fontSize: '22px' }));
  }

  /* --------------------------------------------------------
     YARDIMCI: Sonuçları render et
  -------------------------------------------------------- */
  _renderResults(results: any[]) {
    for (let i = 0; i < this.resultsListTxts.length; i++) {
      const r = results[i];
      if (!r) { this.resultsListTxts[i].setText(''); continue; }
      const rankIcon  = i < 3 ? MEDALS[i] : `  ${i + 1}.`;
      const meTag     = r.id === roomState.myId ? ' ◄' : '  ';
      const scorePart = String(Math.floor(r.score)).padStart(6, ' ');
      const namePart  = r.name.padEnd(9);
      const line      = `${rankIcon}  ${namePart}  ${scorePart}${meTag}`;
      this.resultsListTxts[i].setText(line);
      const colors = ['#ffcc00', '#c8d8e0', '#cc8833'];
      const col    = i < 3 ? colors[i] : colorHex(r.color);
      this.resultsListTxts[i].setStyle({
        color: col,
        fontSize: i === 0 ? '30px' : '26px',
      });
    }
    roomState.results = results;
  }

  /* --------------------------------------------------------
     YARDIMCI: Oyuncu listesini güncelle
  -------------------------------------------------------- */
  private _renderPlayerList() {
    const players = [...roomState.players.values()];
    const myPlayer = roomState.players.get(roomState.myId);
    const amHost = myPlayer?.isHost ?? false;

    for (let i = 0; i < this.playerListTxts.length; i++) {
      const p = players[i];
      if (!p) {
        this.playerListTxts[i].setText('');
        continue;
      }
      const hostTag = p.isHost ? ' 👑' : '   ';
      const meTag   = p.id === roomState.myId ? ' ◄' : '  ';
      const label   = `■  ${p.name.padEnd(8)}${hostTag}${meTag}`;
      this.playerListTxts[i].setText(label);
      this.playerListTxts[i].setStyle({ color: colorHex(p.color), alpha: 1 });
    }

    /* Başlat butonu: sadece host + en az 1 oyuncu */
    this.startBtn.setVisible(amHost);
    if (amHost) {
      const enoughPlayers = players.length >= 1;
      this.startBtnLabel?.setStyle({
        color: enoughPlayers ? '#001a00' : '#446655',
      });
      this.startBtn.setAlpha(enoughPlayers ? 1 : 0.5);
    }
  }

  /* --------------------------------------------------------
     YARDIMCI: Phase göster/gizle
  -------------------------------------------------------- */
  private _showPhase(ph: 'entry' | 'waiting' | 'results') {
    this.phase = ph;
    this.entryContainer.setVisible(ph === 'entry');
    this.waitingContainer.setVisible(ph === 'waiting');
    this.resultsContainer.setVisible(ph === 'results');

    /* DOM elementleri yalnızca entry'de */
    if (this.nameDom) this.nameDom.setVisible(ph === 'entry');
    if (this.joinCodeDom) this.joinCodeDom.setVisible(ph === 'entry');
  }

  /* --------------------------------------------------------
     YARDIMCI: Skin seç
  -------------------------------------------------------- */
  private _selectSkin(i: number) {
    this.selectedSkin = i;
    for (let j = 0; j < 4; j++) {
      const sel = j === i;
      this.skinBorders[j].setStrokeStyle(sel ? 3 : 1.5, sel ? 0xff7700 : 0x332211, 1);
      this.skinFrames[j].setAlpha(sel ? 1 : 0.35);
      const glow = (this.skinBorders[j] as any).__glow as Phaser.GameObjects.Graphics | undefined;
      if (glow) glow.setAlpha(sel ? 1 : 0);
    }
    localStorage.setItem(STORAGE_SKIN, String(i));
  }

  /* --------------------------------------------------------
     YARDIMCI: Buton yap — premium versiyon
  -------------------------------------------------------- */
  private _makeBtn(
    x: number, y: number, label: string, color: number,
    cb: () => void,
    opts?: { w?: number; h?: number; fontSize?: string },
  ): Phaser.GameObjects.Container {
    const bw = opts?.w ?? 320;
    const bh = opts?.h ?? 68;
    const fs = opts?.fontSize ?? '24px';
    const hx = colorHex(color);

    /* Arka dolgu */
    const bg = this.add.graphics();
    const _bg = (a: number) => {
      bg.clear();
      bg.fillStyle(color, a);
      bg.fillRoundedRect(-bw / 2, -bh / 2, bw, bh, 14);
    };
    _bg(0.10);

    /* Kenar çizgisi */
    const border = this.add.graphics();
    border.lineStyle(2, color, 0.72);
    border.strokeRoundedRect(-bw / 2, -bh / 2, bw, bh, 14);

    /* Üst vurgu */
    const topLine = this.add.graphics();
    topLine.lineStyle(2, color, 0.9);
    topLine.lineBetween(-bw / 2 + 18, -bh / 2 + 1, bw / 2 - 18, -bh / 2 + 1);

    /* Etiket */
    const txt = this.add.text(0, 0, label, {
      fontSize: fs, fontFamily: '"Orbitron", monospace',
      fontStyle: 'bold', color: hx,
    }).setOrigin(0.5).setName('label');

    /* Hit */
    const hit = this.add.rectangle(0, 0, bw, bh, 0xffffff, 0)
      .setInteractive({ useHandCursor: true });
    hit.on('pointerdown', cb);
    hit.on('pointerover', () => _bg(0.22));
    hit.on('pointerout',  () => _bg(0.10));

    return this.add.container(x, y, [bg, border, topLine, txt, hit]);
  }

  /* --------------------------------------------------------
     SCROLLING GRID (StartScene ile aynı minimal versiyon)
  -------------------------------------------------------- */
  private _createGrid() {
    const spacing = 80, cols = Math.ceil(W / spacing) + 1;
    const rows    = Math.ceil(H / spacing) + 1;
    for (let r = 0; r < rows; r++) {
      for (let col = 0; col < cols; col++) {
        if ((r + col) % 5 !== 0) continue;
        this.add.rectangle(col * spacing, r * spacing, 2, 2, 0x112233, 0.6);
      }
    }
  }
}
