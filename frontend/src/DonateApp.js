import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import abi from "./abi/Donation.json";

// Ganti dengan alamat kontrak hasil deploy!
const contractAddress = "YOUR_CONTRACT_ADDRESS_HERE";

function DonateApp() {
  const [donations, setDonations] = useState([]);
  const [amount, setAmount] = useState("");
  const [contract, setContract] = useState(null);

  useEffect(() => {
    if (window.ethereum) {
      const provider = new ethers.BrowserProvider(window.ethereum);
      provider.getSigner().then(signer => {
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
          timestamp: new Date(Number(timestamp) * 1000).toLocaleString()
        });
      }
      setDonations(temp);
    } catch (err) {
      console.error(err);
    }
  };

  const donate = async () => {
    if (!amount || isNaN(amount)) return;
    await window.ethereum.request({ method: "eth_requestAccounts" });
    const tx = await contract.donate({ value: ethers.parseEther(amount) });
    await tx.wait();
    setAmount("");
    loadDonations(contract);
  };

  return (
    <div style={{ maxWidth: 500, margin: "40px auto", padding: 24, border: "1px solid #ccc", borderRadius: 8 }}>
      <h2>Donasi Blockchain Transparan</h2>
      <div>
        <input
          type="number"
          value={amount}
          min="0.001"
          onChange={e => setAmount(e.target.value)}
          placeholder="Jumlah ETH"
          style={{ width: 120, marginRight: 8 }}
        />
        <button onClick={donate}>Donasi</button>
      </div>
      <h3>Riwayat Donasi:</h3>
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
