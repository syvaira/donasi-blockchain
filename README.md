# Web Donasi Transparan Blockchain

## Struktur

- `blockchain/contracts/Donation.sol` — Smart contract Solidity untuk donasi
- `frontend/` — React app
- `frontend/src/abi/Donation.json` — ABI hasil compile contract

## Cara Kerja

1. Deploy smart contract ke testnet (Sepolia, Polygon, dll).
2. Salin ABI dan alamat kontrak ke `frontend/src/abi/Donation.json` dan `DonateApp.js`.
3. Jalankan React app:  
   ```
   cd frontend
   npm install
   npm start
   ```
4. Connect Metamask ke jaringan yang sama.

## Fitur

- Donasi transparan, tercatat di blockchain
- Riwayat donasi real-time
