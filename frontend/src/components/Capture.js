import React, { useState } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import Papa from "papaparse";
import axios from "axios";
import "./Capture.css";

const Capture = () => {
  const { logout } = useAuth0();
  const [duration, setDuration] = useState("");
  const [csvData, setCsvData] = useState([]);
  const [predictedData, setPredictedData] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState(null);

  const handleCapture = async () => {
    try {
      setError("");
      setLoading(true);
      setCsvData([]);
      setPredictedData([]);
      setDownloadUrl(null);

      const response = await axios.post("http://localhost:8000/capture", {
        duration: parseInt(duration),
      });

      const csvText = response.data;
      const rows = csvText.split("\n");
      setCsvData(rows);

      // Send the CSV as a file/blob to prediction endpoint
      const blob = new Blob([csvText], { type: "text/csv" });
      const file = new File([blob], "captured_data.csv");

      const formData = new FormData();
      formData.append("file", file);

      const predictionResponse = await axios.post(
        "http://localhost:8000/predict", // Adjust this endpoint as per your backend
        formData,
        { responseType: "blob" }
      );

      // Save download URL
      const predictionBlob = predictionResponse.data;
      const url = window.URL.createObjectURL(predictionBlob);
      setDownloadUrl(url);

      // Parse for preview
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target.result;
        Papa.parse(text, {
          header: true,
          complete: (results) => {
            setPredictedData(results.data.slice(0, 100));
          },
        });
      };
      reader.readAsText(predictionBlob);
    } catch (err) {
      console.error(err);
      setError("Error during capture or prediction.");
    } finally {
      setLoading(false);
    }
  };

  const downloadRawCSV = () => {
    const csvContent = csvData.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "captured_data.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="capture-container">
      <h1>Capture & Predict</h1>
      <input
        type="number"
        placeholder="Enter duration in seconds"
        value={duration}
        onChange={(e) => setDuration(e.target.value)}
      />
      <button className="capture-button" onClick={handleCapture} disabled={loading}>
        {loading ? "Processing..." : "Capture & Predict"}
      </button>

      {error && <p className="error">{error}</p>}

      {csvData.length > 0 && (
        <button className="download-button" onClick={downloadRawCSV}>
          Download Captured CSV
        </button>
      )}

      {predictedData.length > 0 && (
        <>
          <h2>Prediction Preview</h2>
          <div className="table-container">
            <div className="scrollable-table">
              <table className="csv-table">
                <thead>
                  <tr>
                    {Object.keys(predictedData[0]).map((header, index) => (
                      <th key={index}>{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {predictedData.map((row, rowIndex) => (
                    <tr key={rowIndex}>
                      {Object.values(row).map((cell, cellIndex) => (
                        <td key={cellIndex}>{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {downloadUrl && (
        <a href={downloadUrl} download="predictions.csv" className="download-link download-button">
          Download Predictions
        </a>
      )}

      <button className="logout-button" onClick={() => logout({ returnTo: window.location.origin })}>
        Logout
      </button>
    </div>
  );
};

export default Capture;
