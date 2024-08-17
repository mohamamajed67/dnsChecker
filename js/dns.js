
async function getDnsInfo(domain, recordType) {
    const apiUrl = `https://dns.google.com/resolve?name=${domain}&type=${recordType}`;
    const response = await fetch(apiUrl);
    const data = await response.json();
    return data;
}

document.getElementById('search-form').addEventListener('submit', (event) => {
    event.preventDefault();
    handleSearchButtonClick();
});

function copyTextToClipboard(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
}

function createCopyButton(value, type) {
    const button = document.createElement('button');
    button.className = 'copy-btn';
    button.innerHTML = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
    <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"></path>
</svg>
<div class="copy-tooltip">Copied!</div>
`;

    button.addEventListener('click', () => {
        let copiedValue = value.trim();

        if (type === 'MX') {
            const match = value.match(/^\s*\d+\s+(.+)/);
            if (match) {
                copiedValue = match[1];
            }
        }

        copiedValue = copiedValue.replace(/^\s*\d+\s+/, '');

        if (copiedValue.endsWith('.')) {
            copiedValue = copiedValue.slice(0, -1);
        }

        navigator.clipboard.writeText(copiedValue).then(() => {
            const tooltip = button.querySelector('.copy-tooltip');
            tooltip.style.opacity = 1;
            setTimeout(() => {
                tooltip.style.opacity = 0;
            }, 2000);
        });
    });

    return button;
}

function recordTypeNumberToName(typeNumber) {
    const dnsRecordTypes = {
        1: 'A',
        2: 'NS',
        5: 'CNAME',
        6: 'SOA',
        12: 'PTR',
        15: 'MX',
        16: 'TXT',
        28: 'AAAA',
        33: 'SRV',
        43: 'DS',
        46: 'RRSIG',
        48: 'DNSKEY',
        256: 'CAA',
        257: 'CAA',
    };

    return dnsRecordTypes[typeNumber] || typeNumber;
}

function isIPv4Address(ip) {
    const ipv4Regex = /^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return ipv4Regex.test(ip);
}

function reverseIP(ip) {
    return ip.split('.').reverse().join('.');
}

function isIPv6Address(ip) {
    const ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|(:(:[0-9a-fA-F]{1,4}){1,7}|:))$/;
    return ipv6Regex.test(ip);
}

function reverseIPv6(ip) {
    const expandedIPv6 = ip.replace(/::/g, (match, offset, string) => {
        let fill = '';
        const fillCount = 9 - string.split(':').length;
        for (let i = 0; i < fillCount; i++) {
            fill += ':0000';
        }
        return fill;
    });
    const octets = expandedIPv6.split(':');
    let reversed = '';
    for (const octet of octets) {
        reversed = octet.split('').reverse().join('') + '.' + reversed;
    }
    return reversed + 'ip6.arpa';
}

function addRecordToTable(record, dnsResultElement) {
    const row = document.createElement('tr');
    // const nameCell = document.createElement('td');
    // nameCell.textContent = record.name;
    // row.appendChild(nameCell);

    const typeCell = document.createElement('td');
    const typeName = recordTypeNumberToName(record.type);
    typeCell.textContent = typeName;
    row.appendChild(typeCell);

    const valueCell = document.createElement('td');
    valueCell.className = 'truncate';
    valueCell.textContent = record.data;
    valueCell.setAttribute('data-full-text', record.data);
    row.appendChild(valueCell);

    const copyCell = document.createElement('td');
    const copyButton = createCopyButton(`${record.data}`, typeName);
    copyCell.appendChild(copyButton);
    row.appendChild(copyCell);

    dnsResultElement.appendChild(row);
}

async function handleSearchButtonClick() {
    const domainInput = document.querySelector('input[type="text"]');
    const userInput = domainInput.value.trim();
    if (!userInput) {
        alert('Vui lòng nhập tên miền hoặc địa chỉ IP');
        return;
    }

    const dnsResultElement = document.getElementById('dns-result').tBodies[0];
    dnsResultElement.innerHTML = '';
    const loadingElement = document.getElementById('loading');
    loadingElement.style.display = 'block';

    try {
        let domain = userInput;
        let mailDomain = `mail.${userInput}`;
        let recordTypes = ['NS', 'A', 'MX', 'TXT', 'CNAME', 'SOA', 'PTR'];

        if (isIPv4Address(userInput)) {
            domain = reverseIP(userInput) + '.in-addr.arpa';
            recordTypes = ['PTR', 'SOA'];
        } else if (isIPv6Address(userInput)) {
            domain = reverseIPv6(userInput);
            recordTypes = ['PTR', 'SOA'];
        }

        const mailDnsInfo = await getDnsInfo(mailDomain, 'A');
        const mailRecords = mailDnsInfo.Answer || [];
        mailRecords.forEach(record => addRecordToTable(record, dnsResultElement));

        for (const recordType of recordTypes) {
            const dnsInfo = await getDnsInfo(domain, recordType);
            const records = dnsInfo.Answer || [];

            if (dnsInfo.Authority && dnsInfo.Authority.length > 0 && recordType === 'SOA') {
                dnsInfo.Authority.forEach(record => {
                    if (record.type === 6) {
                        records.push(record);
                    }
                });
            }

            records.forEach(record => addRecordToTable(record, dnsResultElement));
        }
    } catch (error) {
        console.error(error);
        alert('Có lỗi xảy ra, vui lòng thử lại');
    } finally {
        loadingElement.style.display = 'none';
    }
}