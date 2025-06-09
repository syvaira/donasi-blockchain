# Web Donasi Transparan Blockchain (ETH ⇄ IDR Otomatis)

## Struktur

- `blockchain/contracts/Donation.sol` — Smart contract Solidity untuk donasi
- `frontend/` — React app
- `frontend/src/abi/Donation.json` — ABI hasil compile contract

## Cara Deploy

### 1. Deploy Smart Contract
- Buka [Remix](https://remix.ethereum.org)
- Paste `Donation.sol`, compile, deploy ke testnet (Sepolia, Goerli, dll) via Metamask.
- Copy **address** kontrak ke `frontend/src/DonateApp.js` (`contractAddress`)
- Copy **ABI** ke `frontend/src/abi/Donation.json`

### 2. Jalankan React App
```bash
cd frontend
npm install
npm start
```
Buka di browser: [http://localhost:3000](http://localhost:3000)

### 3. Fitur
- Input donasi dalam IDR, konversi otomatis ke ETH (kurs CoinGecko).
- Semua donasi tercatat transparan on-chain, riwayat tampil real-time.
- User cukup konek Metamask ke jaringan yang sama.
