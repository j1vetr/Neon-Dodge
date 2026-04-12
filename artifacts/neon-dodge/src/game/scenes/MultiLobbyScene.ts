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
     ENTRY PANEL
  -------------------------------------------------------- */
  private _buildEntryPanel() {
    const c = this.add.container(0, 0);
    this.entryContainer = c;

    /* Başlık */
    c.add(this.add.text(CX, 140, '🌐 ÇOK OYUNCULU', {
      fontSize: '48px', fontFamily: '"Orbitron", monospace',
      color: '#00ffff',
      stroke: '#003366', strokeThickness: 4,
      shadow: { color: '#00ffff', blur: 24, stroke: true, fill: false, offsetX: 0, offsetY: 0 },
    }).setOrigin(0.5));

    /* Durum */
    this.statusTxt = this.add.text(CX, 210, 'Sunucuya bağlanılıyor...', {
      fontSize: '24px', fontFamily: 'monospace', color: '#446655',
    }).setOrigin(0.5).setDepth(1);
    c.add(this.statusTxt);

    /* Ad alanı */
    c.add(this.add.text(CX, 310, 'OYUNCU ADI (maks 8)', {
      fontSize: '24px', fontFamily: 'monospace', color: '#446655',
    }).setOrigin(0.5));

    /* DOM input */
    this.nameDom = this.add.dom(CX, 370, 'input', `
      width:260px; height:52px;
      background:#0a1a2a; border:2px solid #00ffff;
      border-radius:6px; color:#00ffff;
      font-family:monospace; font-size:28px;
      text-align:center; outline:none;
      text-transform:uppercase;
    `).setDepth(5);
    this.nameInput = this.nameDom.node as HTMLInputElement;
    this.nameInput.maxLength = 8;
    this.nameInput.placeholder = 'ADI';
    c.add(this.nameDom);

    /* Skin seçici */
    c.add(this.add.text(CX, 450, 'ROKETİNİ SEÇ', {
      fontSize: '22px', fontFamily: 'monospace', color: '#446655',
    }).setOrigin(0.5));

    const skinSpacing = 110;
    const skinStartX = CX - skinSpacing * 1.5;
    for (let i = 0; i < 4; i++) {
      const sx = skinStartX + i * skinSpacing;
      const sy = 530;

      const border = this.add.rectangle(sx, sy, 90, 90, 0x00ffff, 0)
        .setStrokeStyle(3, i === this.selectedSkin ? 0x00ffff : 0x224433, 1);
      this.skinBorders.push(border);
      c.add(border);

      const img = this.add.image(sx, sy, SKIN_KEYS[i])
        .setDisplaySize(70, 70).setAlpha(i === this.selectedSkin ? 1 : 0.4);
      this.skinFrames.push(img);
      c.add(img);

      border.setInteractive({ useHandCursor: true });
      border.on('pointerdown', () => this._selectSkin(i));
      img.setInteractive({ useHandCursor: true });
      img.on('pointerdown', () => this._selectSkin(i));
    }

    /* "ODA OLUŞTUR" butonu */
    const btn1 = this._makeBtn(CX - 130, 660, 'ODA OLUŞTUR', 0x00ffff, () => {
      const name = this.nameInput.value.toUpperCase().trim() || 'PLAYER';
      const skin = SKIN_KEYS[this.selectedSkin];
      getSocket().emit('create-room', { name, skin });
    });
    c.add(btn1);

    /* "ODAYA GİR" butonu */
    const btn2 = this._makeBtn(CX + 130, 660, 'ODAYA GİR', 0xff8800, () => {
      this.joinPanel.setVisible(true);
      this.joinCodeInput.focus();
    });
    c.add(btn2);

    /* ── JOIN code alt panel ── */
    this.joinPanel = this.add.container(0, 0);
    this.joinPanel.setVisible(false);
    c.add(this.joinPanel);

    const panelBg = this.add.rectangle(CX, 800, 400, 200, 0x0a1a2a, 0.95)
      .setStrokeStyle(2, 0xff8800, 1);
    this.joinPanel.add(panelBg);

    this.joinPanel.add(this.add.text(CX, 730, 'ODA KODUNU GİR', {
      fontSize: '26px', fontFamily: 'monospace', color: '#ff8800',
    }).setOrigin(0.5));

    this.joinCodeDom = this.add.dom(CX, 790, 'input', `
      width:220px; height:52px;
      background:#0a1a2a; border:2px solid #ff8800;
      border-radius:6px; color:#ff8800;
      font-family:monospace; font-size:32px;
      text-align:center; outline:none;
      text-transform:uppercase;
    `).setDepth(5);
    this.joinCodeInput = this.joinCodeDom.node as HTMLInputElement;
    this.joinCodeInput.maxLength = 5;
    this.joinCodeInput.placeholder = 'XXXXX';
    this.joinPanel.add(this.joinCodeDom);

    const katil = this._makeBtn(CX - 70, 870, 'KATIL', 0xff8800, () => {
      const code  = this.joinCodeInput.value.toUpperCase().trim();
      const name  = this.nameInput.value.toUpperCase().trim() || 'PLAYER';
      const skin  = SKIN_KEYS[this.selectedSkin];
      if (code.length < 3) return;
      getSocket().emit('join-room', { code, name, skin });
    });
    this.joinPanel.add(katil);

    const iptal = this._makeBtn(CX + 70, 870, 'İPTAL', 0x445566, () => {
      this.joinPanel.setVisible(false);
    });
    this.joinPanel.add(iptal);

    /* Geri */
    c.add(this._makeBtn(CX, H * 0.88, '← MENÜYE DÖN', 0x446655, () => {
      disconnectSocket();
      this.scene.start('StartScene');
    }));
  }

  /* --------------------------------------------------------
     WAITING PANEL
  -------------------------------------------------------- */
  private _buildWaitingPanel() {
    const c = this.add.container(0, 0);
    this.waitingContainer = c;

    c.add(this.add.text(CX, 100, 'BEKLEME ODASI', {
      fontSize: '42px', fontFamily: '"Orbitron", monospace',
      color: '#00ffff', stroke: '#003366', strokeThickness: 3,
    }).setOrigin(0.5));

    /* Kod alanı */
    c.add(this.add.text(CX, 188, 'ODA KODU', {
      fontSize: '22px', fontFamily: 'monospace', color: '#446655',
    }).setOrigin(0.5));

    this.waitCodeTxt = this.add.text(CX, 260, '-----', {
      fontSize: '72px', fontFamily: '"Orbitron", monospace',
      color: '#00ffff',
      stroke: '#003366', strokeThickness: 4,
      shadow: { color: '#00ffff', blur: 20, stroke: true, fill: false, offsetX: 0, offsetY: 0 },
    }).setOrigin(0.5);
    c.add(this.waitCodeTxt);

    /* Kopyala */
    const copyBtn = this._makeBtn(CX, 340, '📋 KOPYALA', 0x446655, () => {
      navigator.clipboard?.writeText(roomState.code).catch(() => {});
      (copyBtn.getByName('label') as Phaser.GameObjects.Text | null)?.setText('✓ KOPYALANDI');
      this.time.delayedCall(2000, () => (copyBtn.getByName('label') as Phaser.GameObjects.Text | null)?.setText('📋 KOPYALA'));
    });
    c.add(copyBtn);

    /* Player list area */
    c.add(this.add.text(CX, 410, 'OYUNCULAR', {
      fontSize: '22px', fontFamily: 'monospace', color: '#446655',
    }).setOrigin(0.5));

    /* Slotlar - 8 adet */
    for (let i = 0; i < 8; i++) {
      const txt = this.add.text(CX - 180, 450 + i * 68, '', {
        fontSize: '28px', fontFamily: 'monospace', color: '#224433',
      }).setOrigin(0, 0.5);
      this.playerListTxts.push(txt);
      c.add(txt);
    }

    /* Başlat butonu (sadece host görür) */
    this.startBtn = this._makeBtn(CX, H * 0.86, 'OYUNU BAŞLAT', 0x00ff88, () => {
      getSocket().emit('start-game');
    });
    c.add(this.startBtn);
    this.startBtnLabel = this.startBtn.getByName('label') as Phaser.GameObjects.Text;

    /* Çık */
    c.add(this._makeBtn(CX, H * 0.93, '← ÇIKIŞ', 0x446655, () => {
      disconnectSocket();
      this.scene.start('StartScene');
    }));
  }

  /* --------------------------------------------------------
     RESULTS PANEL
  -------------------------------------------------------- */
  private _buildResultsPanel() {
    const c = this.add.container(0, 0);
    this.resultsContainer = c;

    c.add(this.add.text(CX, 120, '🏆 SONUÇLAR', {
      fontSize: '52px', fontFamily: '"Orbitron", monospace',
      color: '#ffcc00', stroke: '#664400', strokeThickness: 4,
    }).setOrigin(0.5));

    /* Sonuç slotları */
    for (let i = 0; i < 8; i++) {
      const txt = this.add.text(CX, 260 + i * 90, '', {
        fontSize: '32px', fontFamily: 'monospace', color: '#ffffff',
      }).setOrigin(0.5);
      this.resultsListTxts.push(txt);
      c.add(txt);
    }

    c.add(this._makeBtn(CX, H * 0.88, 'LOBİYE DÖN', 0x00ffff, () => {
      getSocket().emit('return-to-lobby');
      /* Hemen lobiye geç, server lobby-reset ile onaylar */
      this._showPhase('waiting');
    }));

    c.add(this._makeBtn(CX, H * 0.94, '← MENÜ', 0x446655, () => {
      disconnectSocket();
      this.scene.start('StartScene');
    }));
  }

  /* --------------------------------------------------------
     YARDIMCI: Sonuçları render et
  -------------------------------------------------------- */
  _renderResults(results: any[]) {
    for (let i = 0; i < this.resultsListTxts.length; i++) {
      const r = results[i];
      if (!r) { this.resultsListTxts[i].setText(''); continue; }
      const medal = i < 3 ? MEDALS[i] + ' ' : `${i + 1}. `;
      const isMe = r.id === roomState.myId ? ' ◄' : '';
      const hex = colorHex(r.color);
      this.resultsListTxts[i].setText(`${medal}${r.name.padEnd(8)}  ${Math.floor(r.score)}`);
      this.resultsListTxts[i].setStyle({ color: i === 0 ? '#ffcc00' : hex });
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
      const hostTag = p.isHost ? ' 👑' : '';
      const meTag   = p.id === roomState.myId ? ' (ben)' : '';
      this.playerListTxts[i].setText(`● ${p.name}${hostTag}${meTag}`);
      this.playerListTxts[i].setStyle({ color: colorHex(p.color) });
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
      this.skinBorders[j].setStrokeStyle(3, j === i ? 0x00ffff : 0x224433, 1);
      this.skinFrames[j].setAlpha(j === i ? 1 : 0.4);
    }
    localStorage.setItem(STORAGE_SKIN, String(i));
  }

  /* --------------------------------------------------------
     YARDIMCI: Buton yap
  -------------------------------------------------------- */
  private _makeBtn(
    x: number, y: number, label: string, color: number,
    cb: () => void,
  ): Phaser.GameObjects.Container {
    const bg = this.add.rectangle(0, 0, 280, 64, color, 0.15)
      .setStrokeStyle(2, color, 0.8);
    const txt = this.add.text(0, 0, label, {
      fontSize: '26px', fontFamily: 'monospace',
      color: colorHex(color),
    }).setOrigin(0.5).setName('label');
    const hit = this.add.rectangle(0, 0, 280, 64, 0xffffff, 0)
      .setInteractive({ useHandCursor: true });
    hit.on('pointerdown', cb);
    hit.on('pointerover', () => bg.setFillStyle(color, 0.28));
    hit.on('pointerout',  () => bg.setFillStyle(color, 0.15));
    const c = this.add.container(x, y, [bg, txt, hit]);
    return c;
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
