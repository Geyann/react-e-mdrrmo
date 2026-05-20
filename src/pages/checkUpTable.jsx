import React, { useState, useEffect } from 'react';
import { supabase } from '../createClient';

// Import DataTables
import DataTable from 'datatables.net-react';
import DT from 'datatables.net-dt';
import 'datatables.net-dt/css/dataTables.dataTables.css';

// Initialize DataTables
DataTable.use(DT);

const CheckUpTable = () => {
    const [checkups, setCheckups] = useState([]);

    useEffect(() => {
        fetchCheckups();
    }, []);

    async function fetchCheckups() {
        // Replace "checkups" with your actual table name in Supabase
        const { data, error } = await supabase
            .from("outPatientCheckUp") // <-- Update this to your actual table name
            .select("*");

        if (error) {
            console.error("Error fetching checkups:", error);
            return;
        }

        setCheckups(data || []);
    }

    // Define table columns
    const columns = [
        { title: "ID", data: "id" },
        { title: "Time Created", data: "created_at" },
        { title: "Patient Name", data: "patientName" },
        { title: "Location / Address", data: "address" },
        { title: "Hospital Name", data: "hospitalName" },
        { title: "Contact Details", data: "reporterContact" },
        { title: "Preferred Date", data: "preferredDate" },
        { title: "Preferred Time", data: "preferredTime" },
        { title: "Mobility", data: "mobility" },
        { title: "Patient for", data: "patientFor" },
        { title: "Escort", data: "escort" },
    ];

    return (
        <div className="admin-container">
            <h1>Check-up Appointments</h1>
            <DataTable
                data={checkups}
                columns={columns}
                className="display admin-table"
                options={{
                    responsive: true,
                    pageLength: 10,
                }}
            >
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Time Created</th>
                        <th>Patient Name</th>
                        <th>Location / Address</th>
                        <th>Hospital Name</th>
                        <th>Contact Details of Person Reporting</th>
                        <th>Preferred Date</th>
                        <th>Preferred Time</th>
                        <th>Mobility</th>
                        <th>Patient for</th>
                        <th>Escort</th>
                    </tr>
                </thead>
            </DataTable>
        </div>
    );
};

export default CheckUpTable;