import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import abi from "./abi/Donation.json";

// Ganti dengan alamat kontrak hasil deploy!
const contractAddress = "YOUR_CONTRACT_ADDRESS_HERE";

function DonateApp() {
  const [donations, setDonations] = useState([]);
  const [idr, setIdr] = useState("");
  const [eth, setEth] = useState("");
  const [kurs, setKurs] = useState(null);
  const [loading, setLoading] = useState(false);
  const [contract, setContract] = useState(null);

  // Fetch kurs ETH/IDR real-time dari CoinGecko
  useEffect(() => {
    fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=idr"
    )
      .then((res) => res.json())
      .then((data) => {
        setKurs(data.ethereum.idr);
      });
  }, []);

  // Konversi otomatis IDR ke ETH
  useEffect(() => {
    if (!kurs || !idr) {
      setEth("");
      return;
    }
    setEth((parseFloat(idr) / kurs).toFixed(6));
  }, [idr, kurs]);

  // Setup ethers.js & load donasi
  useEffect(() => {
    if (window.ethereum) {
      const provider = new ethers.BrowserProvider(window.ethereum);
      provider.getSigner().then((signer) => {
        const cont = new ethers.Contract(contractAddress, abi, signer);
        setContract(cont);
        loadDonations(cont);
      });
    }
  }, []);

  const loadDonations = async (cont) => {
    try {
      const count = await cont.getDonationsCount();
      let temp = [];
      for (let i = count - 1; i >= 0; i--) {
        const [donor, amount, timestamp] = await cont.getDonation(i);
        temp.push({
          donor,
          amount: ethers.formatEther(amount),
          timestamp: new Date(Number(timestamp) * 1000).toLocaleString(),
        });
      }
      setDonations(temp);
    } catch (err) {
      console.error(err);
    }
  };

  const donate = async () => {
    if (!eth || isNaN(eth) || parseFloat(eth) <= 0) return;
    setLoading(true);
    try {
      await window.ethereum.request({ method: "eth_requestAccounts" });
      const tx = await contract.donate({ value: ethers.parseEther(eth) });
      await tx.wait();
      setIdr("");
      setEth("");
      loadDonations(contract);
    } catch (e) {
      alert("Transaksi gagal atau dibatalkan.");
    }
    setLoading(false);
  };

  return (
    <div style={{ maxWidth: 500, margin: "40px auto", padding: 24, border: "1px solid #ccc", borderRadius: 8 }}>
      <h2>Donasi Blockchain Transparan</h2>
      <div style={{ marginBottom: 12 }}>
        Kurs ETH/IDR: {" "}
        <b>
          {kurs ? kurs.toLocaleString("id-ID", { maximumFractionDigits: 0 }) : "Loading..."}
        </b>
      </div>
      <div style={{ marginBottom: 16 }}>
        <input
          type="number"
          value={idr}
          min="1000"
          onChange={e => setIdr(e.target.value)}
          placeholder="Jumlah (IDR)"
          style={{ width: 150, marginRight: 8 }}
        />
        <span>
          ({eth ? eth + " ETH" : "- ETH"})
        </span>
      </div>
      <button onClick={donate} disabled={loading || !eth || parseFloat(eth) <= 0}>
        {loading ? "Mengirim..." : "Donasi"}
      </button>
      <h3 style={{ marginTop: 32 }}>Riwayat Donasi:</h3>
      <ul>
        {donations.map((d, idx) => (
          <li key={idx}>
            <b>{d.donor.slice(0, 6)}...{d.donor.slice(-4)}</b> - {d.amount} ETH - {d.timestamp}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default DonateApp;
