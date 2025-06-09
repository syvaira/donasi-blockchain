import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import abi from "./abi/Donation.json";
import "./style.css";

const contractAddress = "0xa53f0E3cb92f6b9149c38Dbe13AABdb65D9281c2"; // Ganti dengan alamat kontrak hasil deploy!

function shorten(addr) {
  return addr.slice(0, 6) + "..." + addr.slice(-4);
}

function numberFmt(n, opts = {}) {
  return Number(n).toLocaleString("id-ID", { maximumFractionDigits: 8, ...opts });
}

export default function DonateApp() {
  const [donations, setDonations] = useState([]);
  const [idr, setIdr] = useState("");
  const [eth, setEth] = useState("");
  const [kurs, setKurs] = useState(null);
  const [loading, setLoading] = useState(false);
  const [notif, setNotif] = useState({ msg: "", type: "" });
  const [contract, setContract] = useState(null);

  // Fetch kurs ETH/IDR real-time
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
          timestamp: new Date(Number(timestamp) * 1000).toLocaleString("id-ID"),
        });
      }
      setDonations(temp);
    } catch (err) {
      setNotif({ msg: "Gagal memuat data donasi.", type: "err" });
    }
  };

  const donate = async () => {
    setNotif({ msg: "", type: "" });
    if (!eth || isNaN(eth) || parseFloat(eth) <= 0) {
      setNotif({ msg: "Nominal donasi tidak valid.", type: "err" });
      return;
    }
    setLoading(true);
    try {
      await window.ethereum.request({ method: "eth_requestAccounts" });
      const tx = await contract.donate({ value: ethers.parseEther(eth) });
      setNotif({ msg: "Transaksi dikirim, menunggu konfirmasi blockchain...", type: "ok" });
      await tx.wait();
      setNotif({ msg: "Donasi berhasil & tercatat di blockchain! Terima kasih 🙏", type: "ok" });
      setIdr("");
      setEth("");
      loadDonations(contract);
    } catch (e) {
      if (e.code === "ACTION_REJECTED" || (e.message && e.message.includes("User denied"))) {
        setNotif({ msg: "Transaksi dibatalkan.", type: "err" });
      } else {
        setNotif({ msg: "Transaksi gagal: " + (e.message || ""), type: "err" });
      }
    }
    setLoading(false);
  };

  return (
    <>
      <div className="header">
        <h1 style={{margin: 0, fontWeight: 800, letterSpacing: 1}}>Donasi Blockchain Transparan</h1>
        <div style={{fontSize: 18, marginTop: 8, color: "#e3f8f7"}}>
          Setiap donasi tercatat permanen & transparan di blockchain.
        </div>
      </div>
      <div className="container">
        <div className="kurs-info">
          Kurs ETH/IDR:{" "}
          <b>
            {kurs ? numberFmt(kurs, {maximumFractionDigits:0}) : "Memuat..."}
          </b>
        </div>
        <div className="input-row">
          <span className="label-idr">IDR</span>
          <input
            type="number"
            value={idr}
            min="1000"
            step="1000"
            onChange={e => setIdr(e.target.value)}
            placeholder="Nominal donasi (IDR)"
            disabled={loading}
          />
          <span className="label-eth">= {eth ? numberFmt(eth, {maximumFractionDigits:6}) : "-"} ETH</span>
        </div>
        <button className="donate-btn" onClick={donate} disabled={loading || !eth || parseFloat(eth) <= 0}>
          {loading ? "Memproses..." : "Donasi Sekarang"}
        </button>
        {notif.msg && (
          <div className={`status-msg status-${notif.type}`}>{notif.msg}</div>
        )}

        <div className="table-wrap">
          <h3 style={{marginTop: 30, marginBottom: 12, color: "#185a9d"}}>Riwayat Donasi</h3>
          {donations.length === 0 ? (
            <div style={{color:"#888", fontSize: "1.05rem"}}>Belum ada donasi.</div>
          ) : (
            <div style={{overflowX: "auto"}}>
              <table className="donasi-table">
                <thead>
                  <tr>
                    <th>No</th>
                    <th>Donatur</th>
                    <th>Jumlah (ETH)</th>
                    <th>Tanggal/Waktu</th>
                  </tr>
                </thead>
                <tbody>
                  {donations.map((d, idx) => (
                    <tr key={idx}>
                      <td>{donations.length - idx}</td>
                      <td title={d.donor}>{shorten(d.donor)}</td>
                      <td>{numberFmt(d.amount, {maximumFractionDigits: 8})}</td>
                      <td>{d.timestamp}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
