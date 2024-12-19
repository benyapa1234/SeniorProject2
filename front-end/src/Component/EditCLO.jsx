import React, { useState, useEffect } from "react";
import { FaBars } from "react-icons/fa";
import * as XLSX from "xlsx";

export default function CurriculumManagement() {
  const [programs, setPrograms] = useState([]);
  const [selectedProgram, setSelectedProgram] = useState("");
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [selectedSectionId, setSelectedSectionId] = useState("");
  const [selectedSemesterId, setSelectedSemesterId] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [plos, setPlos] = useState([]);
  const [CLOs, setCLOs] = useState([]);
  const [mappings, setMappings] = useState([]);
  const [programCourseData, setProgramCourseData] = useState({
    courses: [],
    sections: [],
    semesters: [],
    years: [],
  });
  const [editClo, setEditClo] = useState(null); // Store the CLO being edited
  const [showEditModal, setShowEditModal] = useState(false); // Control modal visibility
  const [editCloName, setEditCloName] = useState("");
  const [editCloEngName, setEditCloEngName] = useState("");
  const [editCloCode, setEditCloCode] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [excelData, setExcelData] = useState(null);
  const [typeError, setTypeError] = useState(null);

  useEffect(() => {
    fetch("http://localhost:8000/program")
      .then((response) => {
        if (!response.ok) throw new Error("Failed to fetch programs");
        return response.json();
      })
      .then((data) => setPrograms(data))
      .catch((error) => {
        console.error("Error fetching programs:", error);
        setPrograms([]);
      });
  }, []);

  useEffect(() => {
    if (selectedProgram) {
      const selectedProgramData = programs.find(
        (program) => program.program_name === selectedProgram
      );

      if (selectedProgramData) {
        const programId = selectedProgramData.program_id;

        fetch(
          `http://localhost:8000/program_courses_detail?program_id=${programId}`
        )
          .then((response) => {
            if (!response.ok)
              throw new Error("Failed to fetch program_course data");
            return response.json();
          })
          .then((data) => {
            // กรองข้อมูลที่ซ้ำ
            const uniqueCourses = data.filter(
              (value, index, self) =>
                index === self.findIndex((t) => t.course_id === value.course_id)
            );
            const uniqueSections = data.filter(
              (value, index, self) =>
                index ===
                self.findIndex((t) => t.section_id === value.section_id)
            );
            const uniqueSemesters = data.filter(
              (value, index, self) =>
                index ===
                self.findIndex((t) => t.semester_id === value.semester_id)
            );

            // กำหนดค่าที่ไม่ซ้ำให้กับ programCourseData
            setProgramCourseData({
              courses: uniqueCourses.map((item) => item.course_id),
              sections: uniqueSections.map((item) => item.section_id),
              semesters: uniqueSemesters.map((item) => item.semester_id),
              years: [...new Set(data.map((item) => item.year))], // ไม่มีการกรองในที่นี้ถ้าปีไม่ซ้ำ
            });
            setPlos(data.plos || []);
          })
          .catch((error) => {
            console.error("Error fetching program_course data:", error);
            setProgramCourseData({
              courses: [],
              sections: [],
              semesters: [],
              years: [],
            });
            setPlos([]);
          });
      }
    }
  }, [selectedProgram, programs]);

  useEffect(() => {
    if (
      selectedCourseId &&
      selectedSectionId &&
      selectedSemesterId &&
      selectedYear &&
      selectedProgram
    ) {
      const selectedProgramData = programs.find(
        (program) => program.program_name === selectedProgram
      );

      if (!selectedProgramData) {
        console.error("Program not found:", selectedProgram);
        setCLOs([]);
        setMappings([]);
        return;
      }

      const programId = selectedProgramData.program_id;

      // Fetch CLOs data first
      fetch(
        `http://localhost:8000/course_clo?program_id=${programId}&course_id=${selectedCourseId}&semester_id=${selectedSemesterId}&section_id=${selectedSectionId}&year=${selectedYear}`
      )
        .then((response) => {
          if (!response.ok) throw new Error("Failed to fetch CLOs");
          return response.json();
        })
        .then((cloData) => {
          console.log("CLO Data received:", cloData);

          // แปลง CLO Data เป็น array ถ้าไม่ใช่ array
          setCLOs(Array.isArray(cloData) ? cloData : [cloData]);

          // Extract CLO IDs for PLO-CLO mapping
          const cloIds = Array.isArray(cloData)
            ? cloData.map((clo) => clo.CLO_id).join(",")
            : cloData.CLO_id;

          console.log("Fetching PLO-CLO mappings for CLO IDs:", cloIds);

          if (cloIds) {
            // Fetch PLO-CLO mappings based on CLO IDs
            return fetch(`http://localhost:8000/plo_clo?clo_ids=${cloIds}`);
          } else {
            console.log("No CLO IDs available for PLO-CLO mappings");
            setMappings([]);
            return null;
          }
        })
        .then((response) => {
          if (response && !response.ok)
            throw new Error("Failed to fetch PLO-CLO mappings");
          return response ? response.json() : [];
        })
        .then((mappingData) => {
          console.log("PLO-CLO Mapping Data received:", mappingData);

          // แปลง PLO-CLO Data เป็น array ถ้าไม่ใช่ array
          const formattedMappings = (
            Array.isArray(mappingData) ? mappingData : [mappingData]
          ).map((mapping) => ({
            ...mapping,
            PLO_code: mapping.CLO_code, // สลับ CLO code ให้ไปอยู่ในตำแหน่ง PLO_code
            CLO_code: mapping.PLO_code, // และนำ PLO code ไปแทนที่ CLO code
          }));

          // ไม่แสดง PLO_name และ CLO_name
          setMappings(formattedMappings);
        })
        .catch((error) => {
          console.error("Error fetching PLO-CLO mappings or CLOs:", error);
          setMappings([]);
        });
    } else {
      // Clear data if all fields are not selected
      setCLOs([]);
      setMappings([]);
    }
  }, [
    selectedCourseId,
    selectedSectionId,
    selectedSemesterId,
    selectedYear,
    selectedProgram,
    programs,
  ]);

  const handleSelectProgram = (programName) => {
    setSelectedProgram(programName);
  };

  const handleEditClo = (cloId) => {
    const cloToEdit = CLOs.find((clo) => clo.CLO_id === cloId);
    if (cloToEdit) {
      setEditClo(cloToEdit); // Set the CLO to edit
      setEditCloName(cloToEdit.CLO_name || ""); // Initialize CLO name
      setEditCloEngName(cloToEdit.CLO_engname || ""); // Initialize CLO English name
      setShowEditModal(true); // Show the modal
    }
  };

  const handleSaveClo = async () => {
    if (!editClo) return;

    // หา program_id จากโปรแกรมที่เลือก
    const selectedProgramData = programs.find(
      (program) => program.program_name === selectedProgram
    );

    if (!selectedProgramData) {
      console.error("Program not found:", selectedProgram);
      return;
    }

    const updatedCLO = {
      ...editClo,
      CLO_name: editCloName,
      CLO_engname: editCloEngName,
    };

    try {
      const response = await fetch("http://localhost:8000/course_clo", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clo_id: editClo.CLO_id, // ใช้ CLO_id ในการอ้างอิงข้อมูลที่จะอัปเดต
          program_id: selectedProgramData.program_id,
          course_id: selectedCourseId,
          semester_id: selectedSemesterId,
          section_id: selectedSectionId,
          year: selectedYear,
          CLO_name: editCloName,
          CLO_engname: editCloEngName,
        }),
      });

      if (response.ok) {
        const updatedCLOs = CLOs.map((clo) =>
          clo.CLO_id === editClo.CLO_id ? updatedCLO : clo
        );
        setCLOs(updatedCLOs); // อัปเดตข้อมูล CLOs ใน state
        console.log("CLO updated successfully!");
      } else {
        const error = await response.json();
        console.error("Failed to update CLO:", error.message);
      }
    } catch (err) {
      console.error("Error updating CLO:", err);
    }

    setShowEditModal(false); // ปิด Modal หลังบันทึก
  };

  const handleDeleteClo = async (
    cloId,
    courseId,
    semesterId,
    sectionId,
    year,
    programName
  ) => {
    if (
      !cloId ||
      !courseId ||
      !semesterId ||
      !sectionId ||
      !year ||
      !programName
    ) {
      console.error("Missing required fields:", {
        cloId,
        courseId,
        semesterId,
        sectionId,
        year,
        programName,
      });
      alert("Missing required fields. Please check your data.");
      return;
    }

    // Find the program_id based on program_name
    const selectedProgramData = programs.find(
      (program) => program.program_name === programName
    );

    if (!selectedProgramData) {
      console.error("Program not found:", programName);
      alert("Program not found.");
      return;
    }

    const programId = selectedProgramData.program_id;

    // Console log selected data
    console.log("Selected CLO Data:", {
      cloId,
      courseId,
      semesterId,
      sectionId,
      year,
      programId,
    });
    console.log("Sending DELETE request with data:", {
      cloId,
      courseId,
      semesterId,
      sectionId,
      year,
      programId,
    });

    if (window.confirm("Are you sure you want to delete this CLO?")) {
      try {
        const response = await fetch("http://localhost:8000/course_clo", {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            clo_id: cloId,
            course_id: courseId,
            semester_id: semesterId,
            section_id: sectionId,
            year: year,
            program_id: programId,
          }),
        });

        console.log("Response status:", response.status);

        if (response.ok) {
          const result = await response.json();
          console.log("CLO deleted successfully:", result.message);
          setCLOs((prevCLOs) => prevCLOs.filter((clo) => clo.CLO_id !== cloId));
        } else {
          const error = await response.json();
          console.error("Failed to delete CLO:", error.message);
          alert(`Failed to delete CLO: ${error.message}`);
        }
      } catch (error) {
        console.error("Error while deleting CLO:", error);
        alert("An error occurred while deleting the CLO.");
      }
    }
  };

  const handleAddClo = async () => {
    // ตรวจสอบว่าเลือกข้อมูลครบทุกฟิลด์หรือไม่
    if (
      !selectedProgram ||
      !selectedCourseId ||
      !selectedSemesterId ||
      !selectedSectionId ||
      !selectedYear ||
      !editCloCode ||
      !editCloName ||
      !editCloEngName
    ) {
      alert("Please fill in all required fields to add a CLO.");
      return;
    }

    // เตรียมข้อมูลที่จะส่งไป
    const newClo = {
      program_id: programs.find(
        (program) => program.program_name === selectedProgram
      )?.program_id,
      course_id: selectedCourseId,
      semester_id: selectedSemesterId,
      section_id: selectedSectionId,
      year: selectedYear,
      CLO_code: editCloCode, // เพิ่ม CLO_code
      CLO_name: editCloName,
      CLO_engname: editCloEngName,
    };

    try {
      const response = await fetch("http://localhost:8000/program_course_clo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newClo),
      });

      if (response.ok) {
        const createdClo = await response.json();
        setCLOs((prevCLOs) => [...prevCLOs, createdClo]);
        setEditCloCode(""); // ล้างค่า CLO_code หลังการเพิ่ม
        setEditCloName("");
        setEditCloEngName("");
        alert("CLO added successfully!");
      } else {
        const error = await response.json();
        console.error("Failed to add CLO:", error.message);
        alert(`Error: ${error.message}`);
      }
    } catch (error) {
      console.error("Error adding CLO:", error);
      alert("An error occurred while adding the CLO.");
    }
  };

  const handleFileUpload = async (e) => {
    let fileTypes = [
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "text/csv",
    ];
    let selectedFile = e.target.files[0];
  
    if (selectedFile) {
      if (fileTypes.includes(selectedFile.type)) {
        setTypeError(null);
        let reader = new FileReader();
        reader.onload = async (event) => {
          try {
            const data = event.target.result;
            const workbook = XLSX.read(data, { type: "binary" });
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(sheet);
  
            // เพิ่มข้อมูลที่เกี่ยวข้องจาก UI
            const updatedData = jsonData.map((row) => ({
              program_id: programs.find(
                (program) => program.program_name === selectedProgram
              )?.program_id,
              course_id: selectedCourseId,
              semester_id: selectedSemesterId,
              section_id: selectedSectionId,
              year: selectedYear,
              CLO_code: row.CLO_code,
              CLO_name: row.CLO_name,
              CLO_engname: row.CLO_engname,
            }));
  
            setExcelData(updatedData); // อัปเดตข้อมูลใน State
            console.log("Uploaded File Data:", updatedData);
          } catch (error) {
            console.error("Error reading file:", error);
          }
        };
        reader.onerror = (error) => {
          console.error("Error reading file:", error);
        };
        reader.readAsBinaryString(selectedFile);
      } else {
        setTypeError("Please select only Excel file types");
      }
    } else {
      console.log("Please select your file");
    }
  };
  
  const handlePasteButtonClick = async () => {
    try {
      if (!navigator.clipboard || !navigator.clipboard.readText) {
        alert("Clipboard API is not supported in this browser.");
        return;
      }
  
      // อ่านข้อมูลจาก Clipboard
      const text = await navigator.clipboard.readText();
  
      if (!text) {
        alert("No text found in clipboard!");
        return;
      }
  
      console.log("Raw Clipboard Data:", text);
  
      // ใช้ XLSX เพื่อแปลงข้อมูลที่วางเป็น JSON
      const workbook = XLSX.read(text, { type: "string" }); // แปลงข้อมูลใน clipboard เป็น workbook
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(sheet);
  
      console.log("Parsed Data:", jsonData);
  
      // เพิ่มข้อมูลที่เกี่ยวข้องจาก UI
      const updatedData = jsonData.map((row) => ({
        program_id: programs.find(
          (program) => program.program_name === selectedProgram
        )?.program_id,
        course_id: selectedCourseId,
        semester_id: selectedSemesterId,
        section_id: selectedSectionId,
        year: selectedYear,
        CLO_code: row.CLO_code,
        CLO_name: row.CLO_name,
        CLO_engname: row.CLO_engname,
      }));
  
      setExcelData(updatedData); // อัปเดตข้อมูลใน State
      console.log("Pasted Data:", updatedData);
    } catch (err) {
      console.error("Failed to paste data:", err);
      alert("Failed to paste data. Make sure you copied valid Excel data.");
    }
  };
  
  
  const handleUploadButtonClick = () => {
    if (excelData && excelData.length > 0) {
      fetch("http://localhost:8000/program_course_clo/excel", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(excelData),
      })
        .then((response) => {
          if (!response.ok) {
            return response.text().then((text) => {
              throw new Error(text);
            });
          }
          return response.json();
        })
        .then((data) => {
          console.log("Success:", data);
          alert("Data Uploaded Successfully!");
          setExcelData(null); // ล้างข้อมูลหลังจากอัปโหลดสำเร็จ
        })
        .catch((error) => {
          console.error("Error:", error);
          alert("An error occurred: " + error.message);
        });
    } else {
      console.error("No data to upload");
      alert("No data to upload. Please paste or upload data first.");
    }
  };

  return (
    <div
      className="container-fluid"
      style={{ backgroundColor: "#f1f1f1", padding: "20px" }}
    >
      <div className="d-flex">
        <button className="btn btn-outline-dark me-3">
          <FaBars />
        </button>
        <h5 className="my-auto">Program:</h5>
      </div>

      <div className="card mt-3 p-3" style={{ backgroundColor: "#e0e4cc" }}>
        {programs.length === 0 ? (
          <p>No programs available</p>
        ) : (
          <select
            className="form-select"
            value={selectedProgram || ""}
            onChange={(e) => handleSelectProgram(e.target.value)}
          >
            <option value="" disabled>
              Select Program
            </option>
            {programs.map((program) => (
              <option key={program.program_id} value={program.program_name}>
                {program.program_name}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="row mt-3">
        <div className="col-md-3">
          <select
            className="form-select"
            value={selectedCourseId || ""}
            onChange={(e) => setSelectedCourseId(e.target.value)}
            disabled={!programCourseData.courses.length}
          >
            <option value="" disabled>
              Select Course
            </option>
            {programCourseData.courses.map((course) => (
              <option key={course} value={course}>
                {course}
              </option>
            ))}
          </select>
        </div>

        <div className="col-md-3">
          <select
            className="form-select"
            value={selectedSectionId || ""}
            onChange={(e) => setSelectedSectionId(e.target.value)}
            disabled={!programCourseData.sections.length}
          >
            <option value="" disabled>
              Select Section
            </option>
            {programCourseData.sections.map((section) => (
              <option key={section} value={section}>
                {section}
              </option>
            ))}
          </select>
        </div>

        <div className="col-md-3">
          <select
            className="form-select"
            value={selectedSemesterId || ""}
            onChange={(e) => setSelectedSemesterId(e.target.value)}
            disabled={!programCourseData.semesters.length}
          >
            <option value="" disabled>
              Select Semester
            </option>
            {programCourseData.semesters.map((semester) => (
              <option key={semester} value={semester}>
                {semester}
              </option>
            ))}
          </select>
        </div>

        <div className="col-md-3">
          <select
            className="form-select"
            value={selectedYear || ""}
            onChange={(e) => setSelectedYear(e.target.value)}
            disabled={!programCourseData.years.length}
          >
            <option value="" disabled>
              Select Year
            </option>
            {programCourseData.years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-3">
        <button
          onClick={() => setShowAddModal(true)} // แสดง modal เมื่อคลิกปุ่ม
          className="btn btn-success"
        >
          Add CLO
        </button>

        <label htmlFor="uploadExcel" className="btn btn-primary ms-3">
    Upload from Excel
  </label>
  <input
    type="file"
    id="uploadExcel"
    className="form-control d-none"
    accept=".xlsx, .xls"
    onChange={handleFileUpload}
  />

  {/* ปุ่มใหม่สำหรับ Paste และ Upload */}
  <div className="mt-3 d-flex flex-column align-items-start">
    {/* ปุ่ม Paste from Clipboard */}
    <button
      onClick={handlePasteButtonClick}
      className="btn btn-secondary mb-2"
    >
      Paste from Clipboard
    </button>

    {excelData && excelData.length > 0 && (
    <div className="mt-3">
      <h5>Preview Data:</h5>
      <table className="table table-bordered">
        <thead>
          <tr>
            <th>CLO Code</th>
            <th>CLO Name</th>
            <th>CLO English Name</th>
          </tr>
        </thead>
        <tbody>
          {excelData.map((row, index) => (
            <tr key={index}>
              <td>{row.CLO_code}</td>
              <td>{row.CLO_name}</td>
              <td>{row.CLO_engname}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
     )}

    {/* ปุ่ม Upload Data */}
    <button
      onClick={handleUploadButtonClick}
      className="btn btn-primary"
      disabled={!excelData || excelData.length === 0} // ปิดปุ่มหากไม่มีข้อมูลใน excelData
    >
      Upload Data
    </button>
  </div>

        {/* ใช้ modal จาก Bootstrap */}
        {showAddModal && (
          <div
            className="modal fade show"
            style={{ display: "block" }}
            aria-labelledby="exampleModalLabel"
            aria-hidden="true"
          >
            <div className="modal-dialog">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title" id="exampleModalLabel">
                    Add New CLO
                  </h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setShowAddModal(false)} // ปิด modal
                    aria-label="Close"
                  ></button>
                </div>
                <div className="modal-body">
                  <label>CLO Code:</label>
                  <input
                    type="text"
                    value={editCloCode}
                    onChange={(e) => setEditCloCode(e.target.value)}
                    style={{ width: "100%" }}
                  />
                  <label>CLO Name:</label>
                  <input
                    type="text"
                    value={editCloName}
                    onChange={(e) => setEditCloName(e.target.value)}
                    style={{ width: "100%" }}
                  />
                  <label>CLO English Name:</label>
                  <input
                    type="text"
                    value={editCloEngName}
                    onChange={(e) => setEditCloEngName(e.target.value)}
                    style={{ width: "100%" }}
                  />
                </div>
                <div className="modal-footer">
                  <button
                    onClick={handleAddClo}
                    style={{
                      backgroundColor: "blue",
                      color: "white",
                      padding: "8px 16px",
                      border: "none",
                      cursor: "pointer",
                      marginTop: "10px",
                      width: "100%",
                    }}
                  >
                    Add CLO
                  </button>
                  <button
                    onClick={() => setShowAddModal(false)} // ปิด modal
                    style={{
                      backgroundColor: "red",
                      color: "white",
                      padding: "8px 16px",
                      border: "none",
                      cursor: "pointer",
                      marginTop: "10px",
                      width: "100%",
                    }}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="card mt-3">
        <div className="card-header">
          <h5>CLOs</h5>
        </div>
        <div className="card-body">
          {!(
            selectedCourseId &&
            selectedSectionId &&
            selectedSemesterId &&
            selectedYear
          ) ? (
            <p className="text-warning">
              กรุณาเลือกข้อมูลให้ครบทุกช่องก่อนแสดง CLO
            </p>
          ) : CLOs.length > 0 ? (
            <table className="table">
              <thead>
                <tr>
                  <th>CLO </th>
                  <th>Detail</th>
                  <th>Detail Eng</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {CLOs.map((clo) => (
                  <tr key={clo.CLO_id}>
                    <td>{clo.CLO_code}</td>
                    <td>{clo.CLO_name}</td>
                    <td>{clo.CLO_engname}</td>
                    <td>
                      <button
                        className="btn btn-warning me-2"
                        onClick={() => handleEditClo(clo.CLO_id)}
                      >
                        Edit
                      </button>

                      <button
                        className="btn btn-danger"
                        onClick={() => {
                          console.log("programId:", selectedProgram);
                          handleDeleteClo(
                            clo.CLO_id,
                            selectedCourseId,
                            selectedSemesterId,
                            selectedSectionId,
                            selectedYear,
                            selectedProgram
                          );
                        }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p>No CLO data available</p>
          )}
        </div>
      </div>

      {showEditModal && (
        <div className="modal show" style={{ display: "block" }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Edit CLO</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowEditModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label htmlFor="clo-name" className="form-label">
                    CLO Name
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    id="clo-name"
                    value={editCloName}
                    onChange={(e) => setEditCloName(e.target.value)}
                  />
                </div>
                <div className="mb-3">
                  <label htmlFor="clo-engname" className="form-label">
                    CLO English Name
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    id="clo-engname"
                    value={editCloEngName}
                    onChange={(e) => setEditCloEngName(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowEditModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleSaveClo}
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="card mt-3">
        <div className="card-header">
          <h5>PLO-CLO Mapping Table</h5>
        </div>
        <div className="card-body">
          {mappings.length > 0 ? (
            (() => {
              // Extract unique PLO_code values
              const ploCodes = Array.from(
                new Set(mappings.map((mapping) => mapping.PLO_code))
              ).sort();

              // Generate table rows grouped by CLO_code
              const cloRows = mappings.reduce((acc, mapping) => {
                if (!acc[mapping.CLO_code])
                  acc[mapping.CLO_code] = { weights: {}, totalWeight: 0 };
                acc[mapping.CLO_code].weights[mapping.PLO_code] =
                  mapping.weight || "";
                acc[mapping.CLO_code].totalWeight += mapping.weight
                  ? parseFloat(mapping.weight)
                  : 0;
                return acc;
              }, {});

              return (
                <table className="table table-bordered">
                  <thead>
                    <tr>
                      <th>CLO</th>
                      {ploCodes.map((plo) => (
                        <th key={plo}>{plo}</th>
                      ))}
                      <th>Weight</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(cloRows).map(([clo, data]) => (
                      <tr key={clo}>
                        <td>{clo}</td>
                        {ploCodes.map((plo) => (
                          <td key={`${clo}-${plo}`}>
                            <input
                              type="radio"
                              name={`${clo}-plo`}
                              checked={!!data.weights[plo]}
                              readOnly
                            />
                          </td>
                        ))}
                        <td>{data.totalWeight}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              );
            })()
          ) : (
            <p>No PLO-CLO mappings available</p>
          )}
        </div>
      </div>
    </div>
  );
}
