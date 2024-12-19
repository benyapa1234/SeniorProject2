const express = require('express');
const cors = require('cors');
const mariadb = require('mariadb');
const port = process.env.PORT || 8000; // port server

// Create a connection pool to MariaDB
const pool = mariadb.createPool({
    host: 'localhost',       // Database host
    user: 'root',            // Database username
    database: 'React_ploclo',// Database name
    password: '',            // Database password
    port: '3306',            // Database port
    connectionLimit: 5,       // Limit the number of connections in the pool
    connectTimeout: 20000 
});

const table = 'data';
const app = express();
app.use(cors());
app.use(express.json());

// Test database connection
pool.getConnection()
    .then(conn => {
        console.log(`Connected to database with threadID: ${conn.threadId}`);
        conn.release(); // Release connection back to pool
    })
    .catch(err => {
        console.error('Error connecting to Database:', err);
    });

// API root route
app.get('/', (req, res) => {
    res.send('Server is working');
});

// API route to get data from database
app.get('/getdata', async (req, res) => {
    try {
        const conn = await pool.getConnection();
        const result = await conn.query(`SELECT * FROM ${table}`);
        res.json(result);
        conn.release();
    } catch (err) {
        res.status(500).send(err);
    }
});

// API route to insert data into database
app.post('/insert',  async (req, res) => {
    const data_list = req.body;

    // Validate input data
    if (!data_list || !Array.isArray(data_list) || data_list.length === 0) {
        return res.status(400).json({
            message: "No data provided or data is not in correct format"
        });
    }

    const columns = Object.keys(data_list[0]).join(',');
    const placeholders = data_list.map(() => `(${Object.keys(data_list[0]).map(() => '?').join(',')})`).join(',');
    const data = data_list.reduce((acc, item) => acc.concat(Object.values(item)), []);

    const query = `
        INSERT INTO ${table} (${columns})
        VALUES ${placeholders}
    `;

    try {
        const conn = await pool.getConnection();
        await conn.query(query, data);
        res.status(201).json({
            message: 'Student data inserted successfully'
        });
        conn.release();
    } catch (err) {
        console.error(err);
        res.status(500).json({
            message: 'Database insertion failed', err
        });
    }
});

// API route to search data in database
// http://localhost:8000/search?column=id&value=3
app.get('/search', async (req, res) => {
    const data = req.query;

    if (!data) {
        return res.status(400).json({ message: "No data" });
    }

    const keys = Object.keys(data);
    const values = Object.values(data);

    const whereClause = keys.map(col => `${col} = ?`).join(' AND ');
    const query = `SELECT * FROM ${table} WHERE ${whereClause}`;

    try {
        const conn = await pool.getConnection();
        const result = await conn.query(query, values);
        res.status(200).json(result);
        conn.release();
    } catch (err) {
        console.error(err);
        res.status(500).json({
            message: 'Database searching failed'
        });
    }
});

// API route to delete data from database
// http://localhost:8000/delete?column=name&value=test2
app.delete('/delete', async (req, res) => {
    const data_select = req.query;

    if (!data_select) {
        return res.status(400).json({
            message: 'No data to delete'
        });
    }

    const keys = Object.keys(data_select);
    const values = Object.values(data_select);

    const whereClause = keys.map(col => `${col} = ?`).join(' AND ');
    const query = `DELETE FROM ${table} WHERE ${whereClause}`;

    try {
        const conn = await pool.getConnection();
        const result = await conn.query(query, values);
        res.status(200).json({
            message: 'Data deletion succeeded',
            affectedRows: result.affectedRows
        });
        conn.release();
    } catch (err) {
        console.error(err);
        res.status(500).json({
            message: 'Database deletion failed'
        });
    }
});

// API route to update data in database
// http://localhost:8000/update?column=id&value=1
app.put('/update', async (req, res) => {
    const data_select = req.query;
    const data_update = req.body;

    if (!data_select || !data_update) {
        return res.status(400).json({
            message: "No data provided"
        });
    }

    // Extract keys and values from the request data
    const keys_select = Object.keys(data_select);
    const values_select = Object.values(data_select);
    const keys_update = Object.keys(data_update);
    const values_update = Object.values(data_update);

    // Create Set clause
    const setClause = keys_update.map(key => `${key} = ?`).join(', ');
    // Create WHERE clause
    const whereClause = keys_select.map(col => `${col} = ?`).join(' AND ');
    // SQL query
    const query = `
        UPDATE ${table}
        SET ${setClause}
        WHERE ${whereClause}
    `;
    // Concatenate the values for the query parameters
    const values = [...values_update, ...values_select];

    try {
        const conn = await pool.getConnection();
        const result = await conn.query(query, values);
        res.status(200).json({
            message: 'Data updated successfully',
            affectedRows: result.affectedRows
        });
        conn.release();
    } catch (err) {
        console.error(err);
        res.status(500).json({
            message: 'Database update failed', err
        });
    }
});

// API route to handle login
app.post('/login', async (req, res) => {
    const { email } = req.body;

    try {
        const conn = await pool.getConnection();

        // Check if the email exists in the database
        const results = await conn.query('SELECT role FROM role WHERE email = ?', [email]);

        if (results.length > 0) {
            // If the email exists, return the role
            res.json({ role: results[0].role });
        } else {
            // If the email doesn't exist, insert a new user with a default role
            const defaultRole = 'user';
            await conn.query('INSERT INTO role (email, role) VALUES (?, ?)', [email, defaultRole]);
            res.json({ role: defaultRole });
        }
        conn.release();
    } catch (err) {
        console.error(err);
        res.status(500).send(err);
    }
});

// เพิ่ม API สำหรับการดึงข้อมูลโปรแกรม
app.get('/program', async (req, res) => {
    try {
        const conn = await pool.getConnection();
        const result = await conn.query('SELECT * FROM program');
        res.json(result);
        conn.release();
    } catch (err) {
        console.error(err);
        res.status(500).send(err);
    }
});

// เพิ่ม API สำหรับการเพิ่มข้อมูลโปรแกรม
app.post('/program', async (req, res) => {
    const { program_name } = req.body;
    if (!program_name) {
        return res.status(400).json({ message: "Program name is required" });
    }

    try {
        const conn = await pool.getConnection();
        await conn.query('INSERT INTO program (program_name) VALUES (?)', [program_name]);
        res.status(201).json({ message: 'Program added successfully' });
        conn.release();
    } catch (err) {
        console.error(err);
        res.status(500).send(err);
    }
});

// เพิ่ม API สำหรับการแก้ไขข้อมูลโปรแกรม
app.put('/program/:program_id', async (req, res) => {
    const { program_id } = req.params;
    const { program_name } = req.body;

    if (!program_name) {
        return res.status(400).json({ message: "Program name is required" });
    }

    try {
        const conn = await pool.getConnection();
        const result = await conn.query('UPDATE program SET program_name = ? WHERE program_id = ?', [program_name, program_id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Program not found' });
        }
        res.status(200).json({ message: 'Program updated successfully' });
        conn.release();
    } catch (err) {
        console.error(err);
        res.status(500).send(err);
    }
});

// เพิ่ม API สำหรับการลบข้อมูลโปรแกรม
app.delete('/program/:program_id', async (req, res) => {
    const { program_id } = req.params;

    try {
        const conn = await pool.getConnection();
        const result = await conn.query('DELETE FROM program WHERE program_id = ?', [program_id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Program not found' });
        }
        res.status(200).json({ message: 'Program deleted successfully' });
        conn.release();
    } catch (err) {
        console.error(err);
        res.status(500).send(err);
    }
});

app.get('/program_plo', async (req, res) => {
    const { program_id } = req.query;  // รับ program_id จาก query string

    if (!program_id) {
        return res.status(400).json({ success: false, message: 'Program ID is required' });
    }

    try {
        const conn = await pool.getConnection();  // เชื่อมต่อกับฐานข้อมูล

        // ดึงข้อมูลจากตาราง program_plo โดยเชื่อมโยง program_id และ plo_id
        const programPlo = await conn.query(
            `SELECT pp.program_id, pp.plo_id, p.PLO_name, p.PLO_engname, p.PLO_code
             FROM program_plo pp
             JOIN plo p ON pp.plo_id = p.PLO_id
             WHERE pp.program_id = ?`,
            [program_id]
        );

        if (programPlo.length === 0) {
            return res.status(404).json({ success: false, message: 'No PLOs found for the selected program' });
        }

        // ส่งข้อมูล PLOs ที่เกี่ยวข้องกับโปรแกรมกลับไป
        res.json(programPlo);
        conn.release();
    } catch (err) {
        console.error('Error fetching program_plo:', err);
        res.status(500).json({ success: false, message: 'Database error' });
    }
});

app.post('/program_plo', async (req, res) => {
    const { program_id, plo_ids } = req.body;

    if (!program_id || !Array.isArray(plo_ids) || plo_ids.length === 0) {
        return res.status(400).json({ message: 'Invalid data' });
    }

    try {
        const conn = await pool.getConnection();
        const values = plo_ids.map((plo_id) => [program_id, plo_id]);
        await conn.query(
            'INSERT INTO program_plo (program_id, plo_id) VALUES ?',
            [values]
        );
        res.status(201).json({ message: 'Relationships added successfully' });
        conn.release();
    } catch (err) {
        console.error('Error adding relationships:', err);
        res.status(500).json({ message: 'Database error' });
    }
});

app.delete('/program_plo', async (req, res) => {
    const { program_id, plo_id } = req.query;

    if (!program_id || !plo_id) {
        return res.status(400).json({ message: 'Invalid data' });
    }

    console.log('Deleting PLO:', { program_id, plo_id }); // ตรวจสอบค่าที่ส่งมาจาก frontend

    try {
        const conn = await pool.getConnection();
        const result = await conn.query(
            'DELETE FROM program_plo WHERE program_id = ? AND plo_id = ?',
            [program_id, plo_id]
        );
        
        // ตรวจสอบผลลัพธ์จากการลบ
        if (result.affectedRows > 0) {
            res.status(200).json({ success: true, message: 'PLO removed successfully' });
        } else {
            res.status(404).json({ message: 'PLO not found' });
        }
        
        conn.release();
    } catch (err) {
        console.error('Error removing PLO:', err);
        res.status(500).json({ message: 'Database error' });
    }
});

app.put('/program_plo', async (req, res) => {
    const { program_id, plo_id, PLO_name, PLO_engname } = req.body; // รับ program_id, plo_id, และข้อมูล PLO ที่อัปเดต

    if (!program_id || !plo_id || !PLO_name || !PLO_engname) {
        return res.status(400).json({ success: false, message: 'Program ID, PLO ID, PLO name, and PLO English name are required' });
    }

    try {
        const conn = await pool.getConnection();

        // ตรวจสอบว่า PLO_id นี้มีอยู่ในตาราง plo หรือไม่
        const ploExists = await conn.query('SELECT PLO_id FROM plo WHERE PLO_id = ?', [plo_id]);
        if (ploExists.length === 0) {
            return res.status(404).json({ success: false, message: 'PLO not found' });
        }

        // อัปเดต PLO_name และ PLO_engname ในตาราง plo
        const result = await conn.query(
            `UPDATE plo 
             SET PLO_name = ?, PLO_engname = ? 
             WHERE PLO_id = ?`,
            [PLO_name, PLO_engname, plo_id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'PLO update failed' });
        }

        res.json({ success: true, message: 'PLO updated successfully' });
        conn.release();
    } catch (err) {
        console.error('Error updating PLO:', err);
        res.status(500).json({ success: false, message: 'Database error' });
    }
});




// API route to get PLOs based on program
app.get('/plo', async (req, res) => {
    const { program_id } = req.query;

    if (!program_id) {
        return res.status(400).json({ success: false, message: 'Program ID is required' });
    }

    try {
        const conn = await pool.getConnection();
        const [plos] = await conn.query(
            `SELECT p.PLO_id, p.PLO_name, p.PLO_engname,  p.PLO_code
             FROM plo p
             INNER JOIN program_plo pp ON p.PLO_id = pp.PLO_id
             WHERE pp.program_id = ?`,
            [program_id]
        );

        // console.log(`Fetched PLOs for program_id ${program_id}:`, plos);

        res.json(plos);
        conn.release();
    } catch (err) {
        console.error('Error fetching PLOs:', err);
        res.status(500).send({ success: false, message: 'Database error' });
    }
});

// API route to add PLO
app.post('/plo', async (req, res) => {
    const { PLO_name, PLO_engname, PLO_code, program_id } = req.body;

    // ตรวจสอบว่าข้อมูลครบถ้วน
    if (!PLO_name || !PLO_engname || !PLO_code || !program_id) {
        return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    try {
        const conn = await pool.getConnection();

        // ตรวจสอบว่า program_id มีอยู่ในตาราง program
        const queryResult = await conn.query('SELECT 1 FROM program WHERE program_id = ?', [program_id]);
        console.log("Query Result:", queryResult);

        if (!queryResult || queryResult.length === 0) {
            conn.release();
            return res.status(400).json({ success: false, message: 'Invalid program_id' });
        }

        // เพิ่ม PLO ลงในตาราง `plo`
        const ploQuery = 'INSERT INTO plo (PLO_name, PLO_engname, PLO_code) VALUES (?, ?, ?)';
        const ploResult = await conn.query(ploQuery, [PLO_name, PLO_engname, PLO_code]);
        console.log("PLO Insert Result:", ploResult);

        const newPloId = Number(ploResult.insertId); // แปลง BigInt เป็น Number

        // เพิ่มความสัมพันธ์ระหว่าง `program_id` และ `PLO_id` ในตาราง `program_plo`
        const programPloQuery = 'INSERT INTO program_plo (program_id, PLO_id) VALUES (?, ?)';
        const programPloResult = await conn.query(programPloQuery, [program_id, newPloId]);
        console.log("Program-PLO Relation Result:", programPloResult);

        conn.release();

        res.json({
            success: true,
            newPlo: {
                PLO_id: newPloId, // ส่งเป็น Number
                PLO_name,
                PLO_engname,
                PLO_code,
                program_id,
            },
        });
    } catch (err) {
        console.error('Error adding PLO:', err);
        res.status(500).json({ success: false, message: 'Database error' });
    }
});

app.post('/plo/excel', async (req, res) => {
    const rows = req.body;

    // ตรวจสอบว่าได้รับ array จาก client หรือไม่
    if (!Array.isArray(rows) || rows.length === 0) {
        return res.status(400).json({ success: false, message: 'Data should be a non-empty array' });
    }

    try {
        const conn = await pool.getConnection();

        // วน loop เพิ่มข้อมูลทีละแถว
        for (const row of rows) {
            const { PLO_name, PLO_engname, PLO_code, program_id } = row;

            // ตรวจสอบว่าข้อมูลครบถ้วน
            if (!PLO_name || !PLO_engname || !PLO_code || !program_id) {
                conn.release();
                return res.status(400).json({
                    success: false,
                    message: `Missing required fields in one of the rows: ${JSON.stringify(row)}`,
                });
            }

            // ตรวจสอบว่า program_id มีอยู่
            const queryResult = await conn.query('SELECT 1 FROM program WHERE program_id = ?', [program_id]);
            if (!queryResult || queryResult.length === 0) {
                conn.release();
                return res.status(400).json({
                    success: false,
                    message: `Invalid program_id in one of the rows: ${program_id}`,
                });
            }

            // เพิ่ม PLO ลงในตาราง `plo`
            const ploQuery = 'INSERT INTO plo (PLO_name, PLO_engname, PLO_code) VALUES (?, ?, ?)';
            const ploResult = await conn.query(ploQuery, [PLO_name, PLO_engname, PLO_code]);
            const newPloId = Number(ploResult.insertId);

            // เพิ่มความสัมพันธ์ระหว่าง program_id และ PLO_id
            const programPloQuery = 'INSERT INTO program_plo (program_id, PLO_id) VALUES (?, ?)';
            await conn.query(programPloQuery, [program_id, newPloId]);
        }

        conn.release();
        res.json({ success: true, message: 'All rows inserted successfully' });
    } catch (err) {
        console.error('Error processing Excel upload:', err);
        res.status(500).json({ success: false, message: 'Database error' });
    }
});

 
// Fetch all course
// Fetch course from database
app.get('/course', async (req, res) => {
    try {
        const conn = await pool.getConnection();
        const result = await conn.query('SELECT * FROM course');
        res.json(result);
        conn.release();
    } catch (err) {
        console.error(err);
        res.status(500).send('Error fetching course');
    }
});

// Add a new course
app.post('/course', async (req, res) => {
    const { course_id, course_name, course_engname } = req.body;
    try {
        await pool.query('INSERT INTO course (course_id, course_name, course_engname) VALUES (?, ?, ?)', [course_id, course_name, course_engname]);
        res.status(200).send('Course added successfully');
    } catch (error) {
        console.error(error);
        res.status(500).send('Error adding course');
    }
});

// Update a course
app.put('/course/:course_id', async (req, res) => {
    const { course_id } = req.params;
    const { course_name, course_engname } = req.body;

    try {
        await pool.query('UPDATE course SET course_name = ?, course_engname = ? WHERE course_id = ?', [course_name, course_engname, course_id]);
        res.status(200).json({ message: 'Course updated successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error updating course');
    }
});

// Delete a course
app.delete('/course/:course_id', async (req, res) => {
    const { course_id } = req.params;
    try {
        await pool.query('DELETE FROM course WHERE course_id = ?', [course_id]);
        res.status(200).send('Course deleted successfully');
    } catch (error) {
        console.error(error);
        res.status(500).send('Error deleting course');
    }
});


// Get courses by program ID
app.get('/program_course', async (req, res) => {
    const { program_id } = req.query;

    // ตรวจสอบว่า program_id ถูกส่งมาหรือไม่
    if (!program_id) {
        return res.status(400).json({ success: false, message: 'Program ID is required' });
    }

    // Query เพื่อดึงข้อมูลจากฐานข้อมูล
    const query = `
        SELECT 
            pc.course_id, 
            c.course_name, 
            cp.weight 
        FROM 
            program_course pc
        JOIN 
            course c ON pc.course_id = c.course_id
        LEFT JOIN 
            course_plo cp ON pc.course_id = cp.course_id
        WHERE 
            pc.program_id = ?
    `;

    try {
        // ใช้ pool เพื่อเชื่อมต่อและ query ข้อมูล
        const connection = await pool.getConnection();
        const results = await connection.query(query, [program_id]);

        // ส่งผลลัพธ์กลับไปยัง client
        res.json({ success: true, courses: results });

        // ปล่อย connection กลับไปยัง pool
        connection.release();
    } catch (err) {
        console.error('Error fetching program courses:', err);
        res.status(500).json({ success: false, message: 'Database error' });
    }
});

app.post('/program_course', async (req, res) => {
    const { year, semester_id, course_id, course_name, course_engname, section_id, program_id } = req.body;

    // ตรวจสอบข้อมูลที่จำเป็น
    if (!year || !semester_id || !course_id || !course_name || !course_engname || !section_id || !program_id) {
        return res.status(400).json({ message: 'Please provide all required information.' });
    }

    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        // ตรวจสอบว่า course_id มีอยู่ในตาราง course หรือไม่
        const [courseCheck] = await connection.query(
            'SELECT * FROM course WHERE course_id = ?', [course_id]
        );

        if (!courseCheck || courseCheck.length === 0) {
            // ถ้าไม่มี course_id ในตาราง course, ให้เพิ่มข้อมูลใหม่
            await connection.query(
                'INSERT INTO course (course_id, course_name, course_engname) VALUES (?, ?, ?)',
                [course_id, course_name, course_engname]
            );
        }

        // ตรวจสอบว่า semester_id มีอยู่ในตาราง semester หรือไม่
        const [semesterCheck] = await connection.query(
            'SELECT * FROM semester WHERE semester_id = ?', [semester_id]
        );

        if (!semesterCheck || semesterCheck.length === 0) {
            throw new Error(`Semester ID ${semester_id} does not exist.`);
        }

        // ตรวจสอบว่า section_id มีอยู่ในตาราง section หรือไม่
        const [sectionCheck] = await connection.query(
            'SELECT * FROM section WHERE section_id = ?', [section_id]
        );

        if (!sectionCheck || sectionCheck.length === 0) {
            // ถ้าไม่มี section_id ในตาราง section, ให้เพิ่มข้อมูลใหม่
            await connection.query(
                'INSERT INTO section (section_id) VALUES (?)',
                [section_id]  // เพิ่มข้อมูล section_id ที่จำเป็น
            );
        }

        // เพิ่มข้อมูลลงในตาราง program_course
        const result = await connection.query(
            'INSERT INTO program_course (year, semester_id, course_id, section_id, program_id) VALUES (?, ?, ?, ?, ?)',
            [year, semester_id, course_id, section_id, program_id]
        );

        // Commit ข้อมูล
        await connection.commit();

        // แปลง BigInt เป็น String ก่อนส่งกลับ
        const programCourseId = result.insertId.toString();

        res.status(201).json({
            message: 'Data added successfully',
            data: {
                program_course_id: programCourseId, // เปลี่ยน BigInt เป็น String
                year,
                semester_id,
                course_id,
                course_name,
                course_engname,
                section_id,
                program_id
            }
        });
    } catch (err) {
        await connection.rollback();
        console.error('Error adding program_course:', err.message);
        res.status(500).json({ message: 'An error occurred while adding the data.', error: err.message });
    } finally {
        connection.release();
    }
});

// Route for deleting a course based on program_id, semester_id, and course_id
app.delete('/program_course', async (req, res) => {
    const { program_id, semester_id, course_id } = req.query; // รับค่าจาก query parameters

    // ตรวจสอบว่าค่าที่จำเป็นถูกส่งมาครบหรือไม่
    if (!program_id || !semester_id || !course_id) {
        return res.status(400).json({ message: 'Missing required parameters' });
    }

    try {
        // สร้าง Connection จาก Pool
        const conn = await pool.getConnection();

        // SQL Query สำหรับการลบข้อมูล
        const deleteQuery = `
            DELETE FROM program_course 
            WHERE program_id = ? AND semester_id = ? AND course_id = ?
        `;

        // Execute SQL Query
        const result = await conn.query(deleteQuery, [program_id, semester_id, course_id]);
        conn.release(); // ปิดการเชื่อมต่อ

        if (result.affectedRows > 0) {
            res.status(200).json({ message: 'Course deleted successfully' });
        } else {
            res.status(404).json({ message: 'Course not found or already deleted' });
        }
    } catch (err) {
        console.error('Error deleting course:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

app.put('/program_course/:course_id', async (req, res) => {
    const { course_id } = req.params; // รับ course_id จาก URL
    const { new_course_id, course_name, course_engname } = req.body;

    if (!course_id || !new_course_id || !course_name || !course_engname) {
        return res.status(400).json({ message: 'course_id, new_course_id, course_name, and course_engname are required' });
    }

    let conn;
    try {
        conn = await pool.getConnection();
        await conn.beginTransaction(); // เริ่ม Transaction

        // ตรวจสอบว่า new_course_id มีอยู่ในตาราง course หรือไม่
        const [existingNewCourse] = await conn.query('SELECT * FROM course WHERE course_id = ?', [new_course_id]);

        if (!existingNewCourse) {
            // ถ้า new_course_id ไม่มีในตาราง course, ต้องเพิ่มมัน
            await conn.query('INSERT INTO course (course_id, course_name, course_engname) VALUES (?, ?, ?)', 
                [new_course_id, course_name, course_engname]);
        }

        // อัปเดต course_id ในตาราง program_course และตารางที่เกี่ยวข้อง
        await conn.query('UPDATE program_course SET course_id = ? WHERE course_id = ?', [new_course_id, course_id]);

        // อัปเดต course_id ในตารางที่อ้างอิงอื่นๆ (เช่น course_plo, plo_clo, course_clo)
        await conn.query('UPDATE course_plo SET course_id = ? WHERE course_id = ?', [new_course_id, course_id]);
        await conn.query('UPDATE plo_clo SET course_id = ? WHERE course_id = ?', [new_course_id, course_id]);
        await conn.query('UPDATE course_clo SET course_id = ? WHERE course_id = ?', [new_course_id, course_id]);

        // อัปเดตข้อมูล course ในตาราง course
        await conn.query('UPDATE course SET course_name = ?, course_engname = ? WHERE course_id = ?', 
            [course_name, course_engname, new_course_id]);

        await conn.commit(); // ยืนยัน Transaction
        res.status(200).json({ message: 'Course updated successfully.' });
    } catch (err) {
        if (conn) await conn.rollback(); // ยกเลิก Transaction หากเกิดข้อผิดพลาด
        console.error('Error updating program_course:', err);
        res.status(500).json({ message: 'Internal Server Error' });
    } finally {
        if (conn) conn.release(); // ปิด Connection
    }
});



// app.post('/course_plo', (req, res) => {
//     const { weights } = req.body;

//     if (!weights) {
//         return res.status(400).json({ success: false, message: 'Invalid data' });
//     }

//     // ใช้ Transaction เพื่อความปลอดภัยในการอัปเดตข้อมูล
//     db.beginTransaction((err) => {
//         if (err) {
//             console.error('Error starting transaction:', err);
//             return res.status(500).json({ success: false, message: 'Database transaction error' });
//         }

//         const queries = weights.map(({ course_id, weight }) => {
//             return new Promise((resolve, reject) => {
//                 db.query(
//                     'UPDATE course_plo SET weight = ? WHERE course_id = ?',
//                     [weight, course_id],
//                     (err, result) => {
//                         if (err) reject(err);
//                         else resolve(result);
//                     }
//                 );
//             });
//         });

//         Promise.all(queries)
//             .then(() => {
//                 db.commit((err) => {
//                     if (err) {
//                         console.error('Error committing transaction:', err);
//                         db.rollback(() => {
//                             res.status(500).json({ success: false, message: 'Transaction error' });
//                         });
//                     } else {
//                         res.json({ success: true, message: 'Weights updated successfully!' });
//                     }
//                 });
//             })
//             .catch((error) => {
//                 console.error('Error updating weights:', error);
//                 db.rollback(() => {
//                     res.status(500).json({ success: false, message: 'Database error' });
//                 });
//             });
//     });
// });


// Get Groups and Sections based on Course ID and Semester
// API ที่ดึงข้อมูล Section โดยระบุ Course ID และ Semester ID

app.get('/section', async (req, res) => {
    try {
        const conn = await pool.getConnection();
        const [result] = await conn.query('SELECT section_id, section_name FROM section');
        
        if (result.length === 0) {
            return res.status(404).json({ message: 'No sections found' });
        }
        
        res.status(200).json(result);
        conn.release();
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error fetching sections' });
    }
});

// Get Semesters
app.get('/semesters', async (req, res) => {
    try {
        const conn = await pool.getConnection();
        const result = await conn.query('SELECT semester_id, semester_name FROM semester');
        
        // ตรวจสอบว่ามีข้อมูลไหม
        if (result.length === 0) {
            return res.status(404).json({ message: 'No semesters found' });
        }

        // แสดงข้อมูลทั้งหมดที่ได้จากฐานข้อมูล
        // console.log(result); // ตรวจสอบผลลัพธ์ที่ได้จากฐานข้อมูล
        res.status(200).json(result); // ส่งผลลัพธ์ทั้งหมดกลับไปยัง client
        conn.release();
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error fetching semester' });
    }
});


// API route to get years from program_course
app.get('/year', async (req, res) => {
    const { program_id } = req.query;

    if (!program_id) {
        return res.status(400).json({ message: 'Program ID is required' });
    }

    try {
        const conn = await pool.getConnection();
        const result = await conn.query(
            'SELECT DISTINCT year FROM program_course WHERE program_id = ? ORDER BY year ASC',
            [program_id]
        );
        res.status(200).json(result);
        conn.release();
    } catch (err) {
        console.error('Error fetching years:', err);
        res.status(500).json({ message: 'Database error' });
    }
});


app.post('/course_clo', async (req, res) => {
    const { course_id, clo_id, semester_id, section_id } = req.body;
    try {
        const conn = await pool.getConnection();
        await conn.query('INSERT INTO course_clo (course_id, clo_id, semester_id, section_id) VALUES (?, ?, ?, ?)', [course_id, clo_id, semester_id, section_id]);
        res.status(201).json({ message: 'Course CLO added successfully' });
        conn.release();
    } catch (err) {
        console.error('Error inserting course CLO:', err);
        res.status(500).json({ message: 'Database error' });
    }
});

app.get('/course_clo', async (req, res) => {
    const { program_id, course_id, semester_id, section_id, year } = req.query;

    if (!program_id || !course_id || !semester_id || !section_id || !year) {
        return res.status(400).json({ message: "Missing required parameters" });
    }

    let conn;

    try {
        conn = await pool.getConnection();

        const query = `
            SELECT 
                course_clo.course_clo_id,
                course_clo.course_id,
                course_clo.semester_id,
                course_clo.section_id,
                course_clo.year,
                clo.CLO_id,
                clo.CLO_code,
                clo.CLO_name,
                clo.CLO_engname,
                clo.timestamp,
                course.course_name,
                course.course_engname
            FROM 
                program_course pc
            JOIN 
                course_clo ON pc.course_id = course_clo.course_id
                AND pc.semester_id = course_clo.semester_id
                AND pc.section_id = course_clo.section_id
                AND pc.year = course_clo.year
            JOIN 
                clo ON course_clo.clo_id = clo.CLO_id
            JOIN 
                course ON course_clo.course_id = course.course_id
            WHERE 
                pc.program_id = ?
                AND course_clo.course_id = ?
                AND course_clo.semester_id = ?
                AND course_clo.section_id = ?
                AND course_clo.year = ?
        `;

        const rows = await conn.query(query, [program_id, course_id, semester_id, section_id, year]);

        // บังคับให้ rows เป็น array
        const result = Array.isArray(rows) ? rows : [rows];

        res.json(result);
    } catch (err) {
        console.error("Error fetching course CLOs:", err);
        res.status(500).json({ message: "Database error" });
    } finally {
        if (conn) conn.release();
    }
});

app.put('/course_clo', async (req, res) => {
    const { program_id, course_id, clo_id, semester_id, section_id, year, CLO_name, CLO_engname } = req.body;

    if (!program_id || !course_id || !clo_id || !semester_id || !section_id || !year || !CLO_name || !CLO_engname) {
        return res.status(400).json({ message: 'Missing required fields' });
    }

    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        // Log query parameters
        console.log("Checking program_course with parameters:", program_id, course_id, semester_id, section_id, year);

        // Check if the combination of program_id, course_id, semester_id, section_id, year exists in program_course
        const [programCourseCheck] = await conn.query(`
            SELECT * FROM program_course
            WHERE program_id = ? AND course_id = ? AND semester_id = ? AND section_id = ? AND year = ?
        `, [program_id, course_id, semester_id, section_id, year]);

        console.log("Program course check result:", programCourseCheck);

        if (!programCourseCheck || programCourseCheck.length === 0) {
            return res.status(404).json({ message: 'Program Course not found' });
        }

        // Log query parameters for course_clo check
        console.log("Checking course_clo with parameters:", course_id, clo_id, semester_id, section_id, year);

        // Check if the given course_clo exists with the provided course_id, clo_id, semester_id, section_id, year
        const [courseCloCheck] = await conn.query(`
            SELECT * FROM course_clo
            WHERE course_id = ? AND clo_id = ? AND semester_id = ? AND section_id = ? AND year = ?
        `, [course_id, clo_id, semester_id, section_id, year]);

        console.log("Course CLO check result:", courseCloCheck);

        if (!courseCloCheck || courseCloCheck.length === 0) {
            return res.status(404).json({ message: 'Course CLO not found' });
        }

        // Update the course_clo table with the new details
        await conn.query(`
            UPDATE course_clo 
            SET clo_id = ?, semester_id = ?, section_id = ?, year = ? 
            WHERE course_id = ? AND clo_id = ? AND semester_id = ? AND section_id = ? AND year = ?
        `, [clo_id, semester_id, section_id, year, course_id, clo_id, semester_id, section_id, year]);

        // Update CLO_name and CLO_engname in the clo table
        await conn.query(`
            UPDATE clo 
            SET CLO_name = ?, CLO_engname = ? 
            WHERE CLO_id = ?
        `, [CLO_name, CLO_engname, clo_id]);

        await conn.commit();
        res.status(200).json({ message: 'Course CLO updated successfully' });
    } catch (err) {
        await conn.rollback();
        console.error('Error updating course CLO:', err);
        res.status(500).json({ message: 'Database error' });
    } finally {
        conn.release();
    }
});

app.delete('/course_clo', async (req, res) => {
    const { clo_id, course_id, semester_id, section_id, year, program_id } = req.body;

    // ตรวจสอบว่าค่าที่จำเป็นถูกส่งมาหรือไม่
    if (!program_id || !clo_id || !course_id || !semester_id || !section_id || !year) {
        return res.status(400).json({ message: 'Missing required fields' });
    }

    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        // ตรวจสอบความสัมพันธ์ระหว่าง program_id และ course_clo ผ่าน program_course
        console.log("Checking relationship between program_id and course_clo:", {
            program_id,
            clo_id,
            course_id,
            semester_id,
            section_id,
            year
        });

        const programCourseCheck = await conn.query(`
            SELECT * FROM program_course
            WHERE program_id = ? AND course_id = ? AND semester_id = ? AND section_id = ? AND year = ?
        `, [program_id, course_id, semester_id, section_id, year]);

        console.log("Program course relationship found:", programCourseCheck);

        if (programCourseCheck.length === 0) {
            return res.status(404).json({ message: 'Program Course relationship not found' });
        }

        // ลบ CLO จากตาราง course_clo
        const deleteCourseCloResult = await conn.query(`
            DELETE FROM course_clo
            WHERE clo_id = ? AND course_id = ? AND semester_id = ? AND section_id = ? AND year = ?
        `, [clo_id, course_id, semester_id, section_id, year]);

        console.log("Delete result from course_clo:", deleteCourseCloResult);

        // ตรวจสอบผลลัพธ์จากคำสั่ง DELETE
        if (deleteCourseCloResult.affectedRows === 0) {
            return res.status(404).json({ message: 'Course CLO not found or not deleted' });
        }

        // ตรวจสอบว่ามีการใช้งาน clo_id ในตาราง course_clo ที่อื่นหรือไม่
        const cloUsageCheck = await conn.query(`
            SELECT COUNT(*) AS count FROM course_clo WHERE clo_id = ?
        `, [clo_id]);

        console.log("CLO usage check result:", cloUsageCheck);

        if (cloUsageCheck[0].count === 0) {
            const deleteCloResult = await conn.query(`
                DELETE FROM clo WHERE clo_id = ?
            `, [clo_id]);
            console.log("Deleted from clo:", deleteCloResult);
        }

        await conn.commit();
        res.status(200).json({ message: 'Course CLO deleted successfully' });
    } catch (err) {
        await conn.rollback();
        console.error('Error deleting course CLO:', err);
        res.status(500).json({ message: 'Database error' });
    } finally {
        conn.release();
    }
});

app.post('/program_course_clo', async (req, res) => {
    const { program_id, course_id, semester_id, section_id, year, CLO_code, CLO_name, CLO_engname } = req.body;

    if (!program_id || !course_id || !semester_id || !section_id || !year || !CLO_code || !CLO_name || !CLO_engname) {
        return res.status(400).json({ message: "Missing required fields. Please select all necessary options and provide CLO details." });
    }

    try {
        const conn = await pool.getConnection();

        // ตรวจสอบว่าข้อมูล program, course, semester, section, และ year มีอยู่หรือไม่
        const checkQuery = `
            SELECT 1 
            FROM program_course
            WHERE 
                program_id = ? 
                AND course_id = ? 
                AND semester_id = ? 
                AND section_id = ? 
                AND year = ?
        `;
        const [existingProgramCourse] = await conn.query(checkQuery, [program_id, course_id, semester_id, section_id, year]);

        if (existingProgramCourse.length === 0) {
            conn.release();
            return res.status(400).json({ message: "The selected program, course, semester, section, or year does not exist." });
        }

        // เพิ่ม CLO ใหม่
        const insertCLOQuery = `
            INSERT INTO clo (CLO_code, CLO_name, CLO_engname, timestamp)
            VALUES (?, ?, ?, NOW())
        `;
        const cloResult = await conn.query(insertCLOQuery, [CLO_code, CLO_name, CLO_engname]);

        // ดึง clo_id ที่เพิ่มมาใหม่
        const clo_id = cloResult.insertId;

        // เพิ่มข้อมูลลงในตาราง course_clo
        const insertCourseCLOQuery = `
            INSERT INTO course_clo (course_id, semester_id, section_id, year, clo_id)
            VALUES (?, ?, ?, ?, ?)
        `;
        await conn.query(insertCourseCLOQuery, [course_id, semester_id, section_id, year, clo_id]);

        res.status(201).json({ message: "CLO added successfully!", clo_id: Number(clo_id) }); // แปลง BigInt เป็น Number
        conn.release();
    } catch (err) {
        console.error("Error adding CLO:", err);
        res.status(500).json({ message: "Database error" });
    }
});

app.post('/program_course_clo/excel', async (req, res) => {
    const cloDataArray = req.body; // รับข้อมูลเป็น array

    if (!Array.isArray(cloDataArray) || cloDataArray.length === 0) {
        return res.status(400).json({ message: "No CLO data provided. Please upload valid Excel data." });
    }

    try {
        const conn = await pool.getConnection();

        for (const cloData of cloDataArray) {
            const {
                program_id,
                course_id,
                semester_id,
                section_id,
                year,
                CLO_code,
                CLO_name,
                CLO_engname,
            } = cloData;

            // ตรวจสอบว่าข้อมูลในแต่ละรายการครบถ้วนหรือไม่
            if (
                !program_id ||
                !course_id ||
                !semester_id ||
                !section_id ||
                !year ||
                !CLO_code ||
                !CLO_name ||
                !CLO_engname
            ) {
                return res
                    .status(400)
                    .json({ message: "Missing required fields in some rows. Please ensure all fields are complete." });
            }

            // ตรวจสอบว่ามี program, course, semester, section, year หรือไม่
            const checkQuery = `
                SELECT 1 
                FROM program_course
                WHERE 
                    program_id = ? 
                    AND course_id = ? 
                    AND semester_id = ? 
                    AND section_id = ? 
                    AND year = ?
            `;
            const [existingProgramCourse] = await conn.query(checkQuery, [
                program_id,
                course_id,
                semester_id,
                section_id,
                year,
            ]);

            if (existingProgramCourse.length === 0) {
                conn.release();
                return res.status(400).json({
                    message: `The program, course, semester, section, or year does not exist for CLO_code: ${CLO_code}`,
                });
            }

            // เพิ่ม CLO ลงในตาราง `clo`
            const insertCLOQuery = `
                INSERT INTO clo (CLO_code, CLO_name, CLO_engname, timestamp)
                VALUES (?, ?, ?, NOW())
            `;
            const cloResult = await conn.query(insertCLOQuery, [
                CLO_code,
                CLO_name,
                CLO_engname,
            ]);

            // ดึง clo_id ที่เพิ่มใหม่
            const clo_id = cloResult.insertId;

            // เพิ่มข้อมูลใน `course_clo`
            const insertCourseCLOQuery = `
                INSERT INTO course_clo (course_id, semester_id, section_id, year, clo_id)
                VALUES (?, ?, ?, ?, ?)
            `;
            await conn.query(insertCourseCLOQuery, [
                course_id,
                semester_id,
                section_id,
                year,
                clo_id,
            ]);
        }

        res.status(201).json({ message: "All CLOs added successfully!" });
        conn.release();
    } catch (err) {
        console.error("Error adding CLOs from Excel:", err);
        res.status(500).json({ message: "Database error occurred while processing Excel data." });
    }
});







// app.delete('/course_clo/:id', async (req, res) => {
//     const { id } = req.params;
//     try {
//         const conn = await pool.getConnection();
//         const result = await conn.query('DELETE FROM course_clo WHERE course_clo_id = ?', [id]);
//         res.status(200).json({ message: 'Course CLO deleted successfully', affectedRows: result.affectedRows });
//         conn.release();
//     } catch (err) {
//         console.error('Error deleting course CLO:', err);
//         res.status(500).json({ message: 'Database error' });
//     }
// });

app.get('/course_plo', async (req, res) => {
    const { program_id } = req.query;

    if (!program_id) {
        return res.status(400).json({ success: false, message: 'Program ID is required' });
    }

    try {
        const query = `
            SELECT cp.course_id, cp.plo_id, cp.weight, c.course_name, p.PLO_code
            FROM course_plo cp
            JOIN course c ON cp.course_id = c.course_id
            JOIN plo p ON cp.plo_id = p.plo_id
            JOIN program_course pc ON cp.course_id = pc.course_id
            WHERE pc.program_id = ?
        `;
        
        const conn = await pool.getConnection();
        const rows = await conn.query(query, [program_id]);

        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'No data found for the given program ID' });
        }

        res.json(rows);
        conn.release();
    } catch (error) {
        console.error('Error fetching course-PLO mappings:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

app.post('/course_plo', async (req, res) => {
    const { program_id, scores } = req.body;

    if (!program_id || !scores || !Array.isArray(scores)) {
        return res.status(400).json({
            success: false,
            message: 'Missing program_id or scores array.',
        });
    }

    try {
        const conn = await pool.getConnection();

        // ดึง PLO IDs จาก scores
        const ploIds = scores.map(score => score.plo_id);
        console.log('PLO IDs to check:', ploIds);

        // สร้าง query แบบ dynamic
        const ploIdsString = ploIds.join(',');
        const query = `
            SELECT plo_id FROM program_plo
            WHERE program_id = ${program_id} AND plo_id IN (${ploIdsString})
        `;

        // เรียก query
        const rawResult = await conn.query(query);
        console.log('Raw validPloRows:', rawResult);

        // ตรวจสอบผลลัพธ์
        const validPloRows = Array.isArray(rawResult) ? rawResult : [rawResult];
        if (validPloRows.length === 0) {
            conn.release();
            return res.status(400).json({
                success: false,
                message: 'No valid PLOs found for the provided program_id.',
            });
        }

        // Map plo_id ที่ valid
        const validPloIds = validPloRows.map(row => row.plo_id);
        console.log('Valid PLO IDs:', validPloIds);

        // กรองเฉพาะข้อมูลที่ valid
        const values = scores
            .filter(score => validPloIds.includes(score.plo_id))
            .map(score => `(${score.course_id}, ${score.plo_id}, ${score.weight})`);

        console.log('Values to insert:', values);

        if (values.length === 0) {
            conn.release();
            return res.status(400).json({
                success: false,
                message: 'No valid scores to add.',
            });
        }

        // Insert ข้อมูลหลายแถว
        const insertQuery = `
            INSERT INTO course_plo (course_id, plo_id, weight)
            VALUES ${values.join(',')}
        `;
        console.log('Generated query:', insertQuery);

        const result = await conn.query(insertQuery);
        conn.release();

        // ใช้ safeJsonStringify
        const safeJsonStringify = (data) => {
            return JSON.stringify(data, (key, value) =>
                typeof value === 'bigint' ? value.toString() : value
            );
        };

        res.send(safeJsonStringify({
            success: true,
            message: 'New mappings added successfully.',
            result: {
                affectedRows: result.affectedRows,
                insertId: result.insertId, // BigInt จะถูกแปลง
                warningStatus: result.warningStatus,
            },
        }));
    } catch (error) {
        console.error('Error adding course-PLO mappings:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error.',
        });
    }
});


// Update course-PLO mapping
app.patch('/course_plo', async (req, res) => {
    const { program_id, course_id, plo_id, weight } = req.body;

    // ตรวจสอบข้อมูลที่จำเป็น
    if (!program_id || !course_id || !plo_id || weight === undefined) {
        return res.status(400).json({
            success: false,
            message: 'Missing required fields: program_id, course_id, plo_id, or weight.',
        });
    }

    try {
        const conn = await pool.getConnection();

        // ตรวจสอบข้อมูลปัจจุบัน
        const queryCheck = `
            SELECT weight 
            FROM course_plo
            WHERE course_id = ? AND plo_id = ?
        `;
        const [currentWeight] = await conn.query(queryCheck, [course_id, plo_id]);

        // หาก weight ไม่เปลี่ยนแปลงให้ส่งข้อความกลับ
        if (currentWeight.length > 0 && currentWeight[0].weight === weight) {
            conn.release();
            return res.status(400).json({
                success: false,
                message: 'The weight value is already the same as the current one.',
            });
        }

        // อัปเดตเฉพาะค่า weight
        const queryUpdate = `
            UPDATE course_plo
            SET weight = ?
            WHERE course_id = ? AND plo_id = ?
        `;
        const result = await conn.query(queryUpdate, [weight, course_id, plo_id]);

        conn.release();

        // แปลงค่า BigInt ให้เป็น String ก่อนที่จะส่งค่าผ่าน JSON
        const serializedResult = JSON.parse(JSON.stringify(result, (key, value) =>
            typeof value === 'bigint' ? value.toString() : value
        ));

        res.json({
            success: true,
            message: 'Weight updated successfully.',
            result: serializedResult,
        });
    } catch (error) {
        console.error('Error updating weight:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error.',
        });
    }
});


app.get('/program_courses_detail', async (req, res) => {
    const { program_id } = req.query;

    if (!program_id) {
        return res.status(400).json({ message: 'Program ID is required' });
    }

    try {
        const conn = await pool.getConnection();
        const result = await conn.query(
            `SELECT 
                pc.program_course_id, 
                pc.year, 
                pc.semester_id, 
                pc.course_id, 
                pc.section_id, 
                p.program_name, 
                c.course_name,
                c.course_engname, 
                s.section_name, 
                sm.semester_name
            FROM 
                program_course pc
            JOIN program p ON pc.program_id = p.program_id
            JOIN course c ON pc.course_id = c.course_id
            LEFT JOIN section s ON pc.section_id = s.section_id
            JOIN semester sm ON pc.semester_id = sm.semester_id
            WHERE 
                pc.program_id = ?`,
            [program_id]
        );

        if (Array.isArray(result)) {
            // console.log('Number of rows fetched:', result.length);
            // console.log('Fetched rows:', result);
        } else {
            console.log('Result is not an array:', result);
        }

        if (result.length === 0) {
            return res.status(404).json({ message: 'No courses found for the given program' });
        }

        res.status(200).json(result); // ส่งคืนข้อมูลทั้งหมด
        conn.release();
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error fetching program_course data' });
    }
});


app.get('/plo_clo', async (req, res) => {
    const { clo_ids } = req.query;

    if (!clo_ids) {
        return res.status(400).json({ message: "Missing CLO IDs" });
    }

    try {
        const conn = await pool.getConnection();

        // แปลง clo_ids จาก string เป็น array
        const cloIdsArray = clo_ids.split(',').map(id => parseInt(id)); // แยก clo_ids และแปลงเป็น array

        const query = `
            SELECT 
                plo_clo.PLO_CLO_id,
                plo_clo.year,
                plo_clo.weight,
                plo_clo.semester_id,
                plo_clo.course_id,
                plo_clo.section_id,
                plo_clo.PLO_id,
                plo_clo.CLO_id,
                plo.PLO_code,
                plo.PLO_name,
                plo.PLO_engname,
                clo.CLO_code,
                clo.CLO_name,
                clo.CLO_engname
            FROM 
                plo_clo
            JOIN 
                plo ON plo_clo.PLO_id = plo.PLO_id
            JOIN 
                clo ON plo_clo.CLO_id = clo.CLO_id
            WHERE 
                plo_clo.CLO_id IN (?)  -- ใช้ IN สำหรับหลาย CLO_ids
        `;

        const [rows] = await conn.query(query, [cloIdsArray]);

        res.json(rows);
        conn.release();
    } catch (err) {
        console.error("Error fetching PLO-CLO mappings:", err);
        res.status(500).json({ message: "Database error" });
    }
});

app.post("/insert_clo", async (req, res) => {
    const {
      program_id,
      course_id,
      section_id,
      semester_id,
      year,
      CLO_code,
      CLO_name,
      CLO_engname,
    } = req.body;
  
    // ตรวจสอบว่าข้อมูลทั้งหมดถูกเลือกแล้ว
    if (!program_id || !course_id || !section_id || !semester_id || !year) {
      return res.status(400).json({ error: "Please select all required fields before inserting CLO" });
    }
  
    const conn = await pool.getConnection();
    try {
      // ตรวจสอบว่าข้อมูล program_course มีอยู่ในระบบหรือไม่
      const checkProgramCourseQuery = `
        SELECT * FROM program_course
        WHERE program_id = ? AND course_id = ? AND section_id = ? AND semester_id = ? AND year = ?
      `;
  
      const results = await conn.query(checkProgramCourseQuery, [program_id, course_id, section_id, semester_id, year]);
  
      if (results.length === 0) {
        return res.status(400).json({
          error: "Selected program/course/section/semester/year not found",
        });
      }
  
      // Insert CLO
      const insertCLOQuery = `
        INSERT INTO course_clo (program_id, course_id, section_id, semester_id, year, CLO_code, CLO_name, CLO_engname)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;
  
      const result = await conn.query(insertCLOQuery, [
        program_id,
        course_id,
        section_id,
        semester_id,
        year,
        CLO_code,
        CLO_name,
        CLO_engname,
      ]);
  
      return res.status(200).json({ message: "CLO inserted successfully" });
  
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Database error", details: err });
    } finally {
      conn.release(); // Always release the connection back to the pool
    }
  });
  
  // API: Delete CLO
  app.delete("/delete_clo/:clo_id", async (req, res) => {
    const { clo_id } = req.params;
  
    if (!clo_id) {
      return res.status(400).json({ error: "CLO ID is required" });
    }
  
    const conn = await pool.getConnection();
    try {
      const deleteCLOQuery = `
        DELETE FROM course_clo WHERE CLO_id = ?
      `;
  
      const result = await conn.query(deleteCLOQuery, [clo_id]);
  
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: "CLO not found" });
      }
  
      return res.status(200).json({ message: "CLO deleted successfully" });
  
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Failed to delete CLO", details: err });
    } finally {
      conn.release(); // Always release the connection back to the pool
    }
  });




// Start the server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});


