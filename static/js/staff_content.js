async function loadUsers() {
            const res = await fetch("/api/users");
            const data = await res.json();
            const tbody = document.getElementById("staffTableBody");
            tbody.innerHTML = "";
            data.data.forEach(user => {
                const row = `<tr><td>${user.id}</td><td>${user.username}</td><td>${user.role}</td></tr>`;
                tbody.innerHTML += row;
            });
        }

        async function addUser() {
            const username = document.getElementById("username").value.trim();
            const password = document.getElementById("password").value.trim();
            const role = document.getElementById("role").value;

            if (!username || !password) return alert("Please enter username and password");

            const res = await fetch("/api/users", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password, role })
            });

            const result = await res.json();
            alert(result.message);
            if (result.status === "success") loadUsers();
        }

        window.onload = loadUsers;