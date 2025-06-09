import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import abi from "./abi/DonationMultiCampaign.json";
import QRCode from "qrcode.react";
import "./style.css";

// === GANTI INI DENGAN ALAMAT KONTRAKMU ===
const contractAddress = "0xC06d351642093f503a17e1648752a4fd1c25300c";
const ETHERSCAN_PREFIX = "https://sepolia.etherscan.io"; // Ganti jika pakai testnet/mainnet lain

function shorten(addr) {
  return addr.slice(0, 6) + "..." + addr.slice(-4);
}
function numberFmt(n, opts = {}) {
  return Number(n).toLocaleString("id-ID", { maximumFractionDigits: 8, ...opts });
}

export default function DonateApp() {
  const [campaigns, setCampaigns] = useState([]);
  const [selectedCampaign, setSelectedCampaign] = useState(0);
  const [donations, setDonations] = useState([]);
  const [idr, setIdr] = useState("");
  const [eth, setEth] = useState("");
  const [kurs, setKurs] = useState(null);
  const [loading, setLoading] = useState(false);
  const [notif, setNotif] = useState({ msg: "", type: "" });
  const [contract, setContract] = useState(null);
  const [message, setMessage] = useState("");
  const [totalDonasi, setTotalDonasi] = useState("0");
  const [topDonors, setTopDonors] = useState([]);
  const [myIsOwner, setMyIsOwner] = useState(false);
  const [adminMode, setAdminMode] = useState(false);
  const [withdrawVal, setWithdrawVal] = useState("");

  // Kurs ETH/IDR
  useEffect(() => {
    fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=idr"
    )
      .then((res) => res.json())
      .then((data) => {
        setKurs(data.ethereum.idr);
      });
  }, []);

  // Konversi IDR -> ETH
  useEffect(() => {
    if (!kurs || !idr) {
      setEth("");
      return;
    }
    setEth((parseFloat(idr) / kurs).toFixed(6));
  }, [idr, kurs]);

  // Setup ethers.js & load data
  useEffect(() => {
    if (window.ethereum) {
      const provider = new ethers.BrowserProvider(window.ethereum);
      provider.getSigner().then(async (signer) => {
        const cont = new ethers.Contract(contractAddress, abi, signer);
        setContract(cont);
        loadCampaigns(cont);
        loadDonations(cont);
        // Cek apakah user adalah owner
        const ownerAddr = await cont.owner();
        const myAddr = await signer.getAddress();
        setMyIsOwner(ownerAddr.toLowerCase() === myAddr.toLowerCase());
      });
    }
  }, []);

  // Load campaigns
  const loadCampaigns = async (cont) => {
    try {
      const count = Number(await cont.getCampaignsCount());
      let temp = [];
      for (let i = 0; i < count; i++) {
        const [name, desc, target, totalDonated, active] = await cont.getCampaign(i);
        temp.push({ name, desc, target, totalDonated, active });
      }
      setCampaigns(temp);
    } catch (err) {
      setNotif({ msg: "Gagal memuat data campaign.", type: "err" });
    }
  };

  // Load donations + leaderboard + total donasi
  const loadDonations = async (cont) => {
    try {
      const count = Number(await cont.getDonationsCount());
      let temp = [];
      let total = 0;
      let donorSum = {};
      for (let i = count - 1; i >= 0; i--) {
        const [donor, amount, timestamp, msg, campaignId] = await cont.getDonation(i);
        if (Number(campaignId) !== Number(selectedCampaign)) continue;
        temp.push({
          donor,
          amount: ethers.formatEther(amount),
          timestamp: new Date(Number(timestamp) * 1000).toLocaleString("id-ID"),
          msg,
          campaignId,
        });
        total += Number(ethers.formatEther(amount));
        donorSum[donor] = (donorSum[donor] || 0) + Number(ethers.formatEther(amount));
      }
      setDonations(temp);
      setTotalDonasi(total);
      // Leaderboard (top 5)
      const leaderboard = Object.entries(donorSum)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([donor, amount]) => ({ donor, amount }));
      setTopDonors(leaderboard);
    } catch (err) {
      setNotif({ msg: "Gagal memuat data donasi.", type: "err" });
    }
  };

  // Update donasi jika ganti campaign
  useEffect(() => {
    if (contract) loadDonations(contract);
    // eslint-disable-next-line
  }, [selectedCampaign]);

  // Donasi
  const donate = async () => {
    setNotif({ msg: "", type: "" });
    if (!eth || isNaN(eth) || parseFloat(eth) <= 0) {
      setNotif({ msg: "Nominal donasi tidak valid.", type: "err" });
      return;
    }
    setLoading(true);
    try {
      await window.ethereum.request({ method: "eth_requestAccounts" });
      const tx = await contract.donate(
        selectedCampaign,
        message || ""
      , { value: ethers.parseEther(eth) });
      setNotif({ msg: "Transaksi dikirim, menunggu konfirmasi blockchain...", type: "ok" });
      await tx.wait();
      setNotif({ msg: "Donasi berhasil & tercatat di blockchain! Terima kasih 🙏", type: "ok" });
      setIdr("");
      setEth("");
      setMessage("");
      loadDonations(contract);
      loadCampaigns(contract);
    } catch (e) {
      if (e.code === "ACTION_REJECTED" || (e.message && e.message.includes("User denied"))) {
        setNotif({ msg: "Transaksi dibatalkan.", type: "err" });
      } else {
        setNotif({ msg: "Transaksi gagal: " + (e.message || ""), type: "err" });
      }
    }
    setLoading(false);
  };

  // Withdraw (admin)
  const withdraw = async () => {
    setNotif({ msg: "", type: "" });
    if (!withdrawVal || isNaN(withdrawVal)) return;
    setLoading(true);
    try {
      const amountWei = ethers.parseEther(withdrawVal);
      await contract.withdraw(selectedCampaign, amountWei);
      setNotif({ msg: "Withdraw berhasil!", type: "ok" });
      setWithdrawVal("");
      loadCampaigns(contract);
      loadDonations(contract);
    } catch (e) {
      setNotif({ msg: "Withdraw gagal: " + (e.message || ""), type: "err" });
    }
    setLoading(false);
  };

  // Add campaign (admin)
  const addCampaign = async () => {
    const name = prompt("Nama campaign/program:");
    if (!name) return;
    const desc = prompt("Deskripsi singkat:");
    if (desc === null) return;
    const targetEth = prompt("Target donasi (ETH):");
    if (!targetEth || isNaN(targetEth)) return;
    setLoading(true);
    try {
      const targetWei = ethers.parseEther(targetEth);
      await contract.createCampaign(name, desc, targetWei);
      setNotif({ msg: "Campaign berhasil dibuat!", type: "ok" });
      loadCampaigns(contract);
    } catch (e) {
      setNotif({ msg: "Gagal membuat campaign: " + (e.message || ""), type: "err" });
    }
    setLoading(false);
  };

  // Progress bar
  const progressBar = (total, target) => {
    const pct = target > 0 ? Math.min(100, (total / target) * 100) : 0;
    return (
      <div style={{width:"100%", background:"#e0e0e0", borderRadius:8, height:22, margin:"12px 0 18px 0"}}>
        <div style={{
          width: pct + "%",
          background: "linear-gradient(90deg,#43cea2,#185a9d)",
          height: "100%",
          borderRadius:8,
          transition: "width 0.6s"
        }}>
          <span style={{color:"#fff", fontWeight:600, marginLeft:10, fontSize:13, lineHeight:"22px"}}>
            {pct.toFixed(1)}%
          </span>
        </div>
      </div>
    );
  };

  // QR Code
  const qrData = contractAddress;

  return (
    <>
      <div className="header">
        <h1 style={{margin: 0, fontWeight: 800, letterSpacing: 1, fontSize:28}}>Donasi Blockchain Transparan</h1>
        <div style={{fontSize: 18, marginTop: 8, color: "#e3f8f7"}}>
          Setiap donasi tercatat permanen & transparan di blockchain.
        </div>
      </div>
      <div className="container">
        <div style={{marginBottom:18}}>
          <b>Pilih Program/Campaign:</b>
          <select
            style={{marginLeft:8, padding:6, borderRadius:6, fontSize:16}}
            value={selectedCampaign}
            onChange={e => setSelectedCampaign(e.target.value)}
          >
            {campaigns.map((c, i) => (
              <option key={i} value={i}>
                {c.name} {c.active ? "" : "(Nonaktif)"}
              </option>
            ))}
          </select>
          {myIsOwner && (
            <button style={{marginLeft:12, fontSize:14, padding:"6px 12px"}}
              onClick={addCampaign}
              disabled={loading}
            >+ Campaign</button>
          )}
        </div>
        {campaigns[selectedCampaign] && (
          <>
            <div style={{fontSize:15, color:"#444", marginBottom:8}}>
              {campaigns[selectedCampaign].desc}
            </div>
            <div className="kurs-info">
              Kurs ETH/IDR:{" "}
              <b>
                {kurs ? numberFmt(kurs, {maximumFractionDigits:0}) : "Memuat..."}
              </b>
            </div>
            <div style={{marginBottom:6}}>
              <b>Total Donasi:</b> {numberFmt(totalDonasi, {maximumFractionDigits:6})} ETH
              {kurs && (
                <> ({numberFmt(totalDonasi * kurs, {maximumFractionDigits:0})} IDR)</>
              )}
            </div>
            <div>
              <b>Target:</b> {numberFmt(ethers.formatEther(campaigns[selectedCampaign].target),{maximumFractionDigits:6})} ETH
            </div>
            {progressBar(totalDonasi, Number(ethers.formatEther(campaigns[selectedCampaign].target)))}
          </>
        )}

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
        <textarea
          placeholder="Pesan/Testimoni (opsional, max 80 karakter)"
          value={message}
          maxLength={80}
          onChange={e => setMessage(e.target.value)}
          style={{width:"100%", margin:"8px 0 6px 0", padding: 8, borderRadius:6, border:"1px solid #bdbdbd", fontSize:15}}
          disabled={loading}
        />
        <button className="donate-btn" onClick={donate} disabled={loading || !eth || parseFloat(eth) <= 0}>
          {loading ? "Memproses..." : "Donasi Sekarang"}
        </button>
        <div style={{marginTop:10,marginBottom:5}}>
          <b>Atau scan QR untuk donasi manual:</b>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:18}}>
          <QRCode value={qrData} size={70} />
          <span style={{fontSize:13,color:"#666"}}>Alamat kontrak:<br/>
            <span style={{fontFamily:"monospace",fontSize:12}}>{shorten(contractAddress)}</span>
          </span>
        </div>
        {notif.msg && (
          <div className={`status-msg status-${notif.type}`}>{notif.msg}</div>
        )}

        {/* ADMIN MODE */}
        {myIsOwner && (
          <div style={{margin:"20px 0 15px 0", padding:"12px 14px", background:"#e3eefb", borderRadius:10}}>
            <b>Admin Panel</b><br/>
            <button style={{marginTop:6, fontSize:14, padding:"3px 14px"}} onClick={()=>setAdminMode(!adminMode)}>
              {adminMode ? "Tutup" : "Buka"} Admin
            </button>
            {adminMode && (
              <>
                <div style={{marginTop:10,marginBottom:6}}>
                  <b>Withdraw (tarik dana campaign):</b>
                  <input
                    type="number"
                    min="0"
                    value={withdrawVal}
                    placeholder="Jumlah ETH"
                    onChange={e=>setWithdrawVal(e.target.value)}
                    style={{marginLeft:8, padding:"4px 10px", borderRadius:6, width:"100px", border:"1px solid #bdbdbd"}}
                  />
                  <button style={{marginLeft:8, fontSize:14, padding:"3px 10px"}} onClick={withdraw} disabled={loading}>Withdraw</button>
                </div>
              </>
            )}
          </div>
        )}

        <div className="table-wrap">
          <h3 style={{marginTop: 30, marginBottom: 10, color: "#185a9d"}}>Leaderboard Top Donatur</h3>
          {topDonors.length === 0 ? (
            <div style={{color:"#888", fontSize: "1.05rem"}}>Belum ada donasi.</div>
          ) : (
            <table className="donasi-table">
              <thead>
              <tr>
                <th>No</th>
                <th>Donatur</th>
                <th>Total Donasi (ETH)</th>
              </tr>
              </thead>
              <tbody>
              {topDonors.map((d, idx) => (
                <tr key={idx}>
                  <td>{idx + 1}</td>
                  <td>{shorten(d.donor)}</td>
                  <td>{numberFmt(d.amount, {maximumFractionDigits:6})}</td>
                </tr>
              ))}
              </tbody>
            </table>
          )}

          <h3 style={{marginTop: 26, marginBottom: 10, color: "#185a9d"}}>Riwayat Donasi</h3>
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
                  <th>Pesan</th>
                  <th>Tanggal</th>
                  <th>Tx</th>
                </tr>
                </thead>
                <tbody>
                {donations.map((d, idx) => (
                  <tr key={idx}>
                    <td>{donations.length - idx}</td>
                    <td title={d.donor}>{shorten(d.donor)}</td>
                    <td>{numberFmt(d.amount, {maximumFractionDigits: 8})}</td>
                    <td>{d.msg}</td>
                    <td>{d.timestamp}</td>
                    <td>
                      <a
                        href={`${ETHERSCAN_PREFIX}/address/${d.donor}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Lihat di Etherscan"
                      >
                        🔗
                      </a>
                    </td>
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
