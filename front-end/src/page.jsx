import React, { useState } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import * as XLSX from 'xlsx';
import { useClipboard } from 'use-clipboard-copy';
import { Button, Modal } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import i18n from './i18n.js';
import DataTable from './Component/DataTable.jsx';

function Page() {
  // const [ExcelFile, setExcelfile] = useState(null);
  const [typeError, setTypeError] = useState(null);
  const clipboard = useClipboard();
  const { t } = useTranslation();

  // Submit state
  const [excelData, setExcelData] = useState(null);
  const [parsedData, setParsedData] = useState(null); // New state for parsed clipboard data
  const [show, setShow] = useState(false);

  const handleFileUpload = (e) => {
    let fileTypes = ['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv'];
    let selectedFile = e.target.files[0];

    if (selectedFile) {
      if (fileTypes.includes(selectedFile.type)) {
        setTypeError(null);
        let reader = new FileReader();
        reader.onload = (e) => {
          try {
            const workbook = XLSX.read(e.target.result, { type: 'buffer' });
            const worksheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[worksheetName];
            const jsondata = XLSX.utils.sheet_to_json(worksheet, { header: 0 });
            setExcelData(jsondata);
            console.log(jsondata);
          } catch (error) {
            console.error('Error reading file:', error);
          }
        };
        reader.onerror = (error) => {
          console.error('Error reading file:', error);
        };
        reader.readAsArrayBuffer(selectedFile);
      } else {
        setTypeError('Please select only Excel file types');
        setExcelData(null);
      }
    } else {
      console.log('Please select your file');
    }
  };

  // const handleUploadButtonClick = () => {
  //   if (excelData) {
  //     fetch('http://localhost:8000/insert', {
  //       method: 'POST',
  //       headers: {
  //         'Content-Type': 'application/json',
  //       },
  //       body: JSON.stringify(excelData),
  //     })
  //       .then((response) => response.json())
  //       .then((data) => {
  //         console.log('Success:', data);
  //         console.log(parsedData)
  //         alert('The excel Data Upload Successfully!');
  //       })
  //       .catch((error) => {
  //         console.error('Error:', error);
  //       });
  //   } else {
  //     console.error('No data to upload');
  //   }
  // };
  const handleUploadButtonClick = () => {
    if (excelData) {
      fetch('http://localhost:8000/insert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(excelData),
      })
      .then(response => {
        if (!response.ok) {
          return response.text().then(text => { throw new Error(text) });
        }
        return response.json();
      })
      .then(data => {
        console.log('Success:', data);
        alert('Data Uploaded Successfully!');
      })
      .catch(error => {
        console.error('Error:', error);
        alert('An error occurred: ' + error.message);
      });
    } else {
      console.error('No data to upload');
    }
  };
  


  const handleDataChange =(newData) =>{
    setParsedData(newData);
  };

  const handleClipboardButtonClick = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const json = convertExcelDataToJson(text);

      if (json) {
        setParsedData(json);
      }
    } catch (error) {
      console.error('Error reading from clipboard:', error);
    }
  };

  const convertExcelDataToJson = (text) => {
    try {
      const rows = text.trim().split('\n');
      const headers = rows[0].split('\t'); // assuming tab-separated values; use ',' for CSV

      const jsonData = rows.slice(1).map((row) => {
        const values = row.split('\t'); // assuming tab-separated values; use ',' for CSV
        return headers.reduce((acc, header, index) => {
          acc[header] = values[index];
          return acc;
        }, {});
      });

      return jsonData;
    } catch (error) {
      console.error('Error converting text to JSON:', error);
      return null;
    }
  };

  let allKeys = [];
  if (excelData) {
    allKeys = Array.from(new Set(excelData.flatMap((row) => Object.keys(row))));
  }

  const handleClose = () => setShow(false);
  const handleShow = () => setShow(true);

  const handleSaveButtonClick = () => {
    if (parsedData) {
      const jsonData = JSON.stringify(parsedData);
      console.log('Data to be saved:', jsonData); // Add this line for debugging
      fetch('http://localhost:8000/insert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: jsonData,
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error('Network response was not ok');
          }
          return response.json();
        })
        .then((data) => {
          console.log('Save Success:', data);
          alert('Data saved successfully!');
        })
        .catch((error) => {
          console.error('Save Error:', error);
        });
    } else {
      console.error('No data to save');
    }
  };

  return (
    <>
      <Button variant="primary" onClick={handleShow}>
        {t('ImportData')}
      </Button>

      <Modal show={show} onHide={handleClose}>
        <Modal.Header closeButton>
          <Modal.Title>{t('ImportData')}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <input
            type="file"
            aria-describedby="inputGroupFileAddon04"
            aria-label="Upload"
            onChange={handleFileUpload}
            accept=".xlsx"
          />
          
          <Button variant="outline-secondary" className="w-100 mb-3" onClick={handleUploadButtonClick}>
            {t('uploadFile')}
          </Button>
          <Button variant="outline-secondary" className="w-100" onClick={handleClipboardButtonClick}>
            {t('clipboard')}
          </Button>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleClose}>{t('close')}</Button>
        </Modal.Footer>
      </Modal>

      <div className="table-container">
      <DataTable data={excelData || parsedData} onDataChange={handleDataChange} />
        <Button variant="success" className="mt-3" onClick={handleSaveButtonClick}>
          {t('saveData')}
        </Button>
      </div>
    </>
  );
}

export default Page;
