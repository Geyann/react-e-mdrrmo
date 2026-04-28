import React, { useState, useEffect } from 'react';
import { supabase } from '../createClient';
import DataTable from 'datatables.net-react';
import DT from 'datatables.net-dt';
import 'datatables.net-dt/css/dataTables.dataTables.css';

const BorrowedVehicles = () => {
DataTable.use(DT); // <--- DO NOT MISS THIS LINE

    const [borrow, setBorrow] = useState([]);

    useEffect(() => {
        fetchUser();
    }, []);

    async function fetchUser() {
        const { data, error } = await supabase
            .from("borrow-vehicle")
            .select("*");

        if (error) {
            console.error("Error fetching reports:", error);
            return;
        }

        setBorrow(data || []);
    }

    // Define table columns
    const columns = [
        { title: "Time Submitted", data: "created_at" },
        { title: "Borrow ID", data: "borrowerId" },
        { title: "Dispatch No.", data: "dispatchNum" },
        { title: "Departure", data: "departure" },
        { title: "Arrival", data: "arrival" },
        { title: "Contact No.", data: "contactNum" },
        { title: "Vehicle Borrowed", data: "vehicle" },
        { title: "Requested By", data: "requestedBy" },
        { title: "Purpose", data: "purpose" },
        { title: "Destination", data: "destination" },
        { title: "Date", data: "date" },
        { title: "Time", data: "time" },
        {
            title: "Action",
            data: null, // No direct mapping to data
            orderable: false, // Disable sorting on buttons
            render: (data, type, row) => {
                // Using a string return or a template for standard DataTables render
                return `
                    <div id="action">
                        <button class="approve-btn" style="color: green;">Approve</button>
                        <button class="decline-btn" style="color: red;">Decline</button>
                    </div>
                `;
            }
        }
    ];

    return (
        <div className="container p-4">
            <DataTable
                data={borrow}
                columns={columns}
                className="display admin-table"
                options={{
                    responsive: true,
                    pageLength: 10,
                    // Additional configuration options here
                }}
            >
                <thead>
                    <tr>
                        <th>Time Submitted</th>
                        <th>Borrow ID</th>
                        <th>Dispatch No.</th>
                        <th>Departure</th>
                        <th>Arrival</th>
                        <th>Contact No.</th>
                        <th>Vehicle Borrowed</th>
                        <th>Requested By</th>
                        <th>Purpose</th>
                        <th>Destination</th>
                        <th>Date</th>
                        <th>Time</th>
                        <th>Action</th>
                    </tr>
                </thead>
            </DataTable>
        </div>
    );
};

export default BorrowedVehicles;