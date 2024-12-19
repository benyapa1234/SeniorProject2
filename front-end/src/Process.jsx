import React, { useState, useEffect } from "react";
import DataTable from "./Component/DataTable.jsx";
import SearchModal from "./Component/SearchModal.jsx";
import DeleteModal from "./Component/DeleteModal.jsx";
import UpdateModal from "./Component/UpdateModal.jsx";


function Process() {
  const [data, setData] = useState([]);
  const [showSearch, setshowSearch] = useState(false);
  const [showDelete, setshowDelete] = useState(false);
  const [showUpdate, setShowUpdate] = useState(false);


  const fetchJSONData = async (URL) => {
    try {
      const response = await fetch(URL);
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return await response.json();
    } catch (error) {
      console.error('There was a problem with the fetch operation: ', error);
    }
  };

  const handleSearch = (searchResults) => {
    setData(searchResults);
  }

  const handleDelete = (data)=> {
    window.location.reload();
  }

  useEffect(() => {
    fetchJSONData('http://localhost:8000/getdata').then((data) => {
      setData(data);
      console.log('fetch json data: complete');
    });
  }, []);

  return (
    <div className="container mt-5">
      <h1>Database Manage</h1>
      <div className="d-flex justify-content-center mb-3">
        <button className="btn btn-secondary mx-2" onClick={() => setshowSearch(true)}>
          SEARCH
        </button>
        <button className="btn btn-warning mx-2" onClick={() => setShowUpdate(true)}>
          UPDATE
        </button>
        <button className="btn btn-danger mx-2" onClick={() => setshowDelete(true)}>
          DELETE
        </button>
      </div>
      <div className="table-responsive">
        <DataTable data={data} />
      </div>
      <SearchModal show={showSearch} onHide={() => setshowSearch(false)} onSearch={handleSearch} />
      <UpdateModal show={showUpdate} onHide={() => setShowUpdate(false)} />
      <DeleteModal show={showDelete} onHide={() => setshowDelete(false)} onDelete={handleDelete}/>
    </div>
  );
}

export default Process;