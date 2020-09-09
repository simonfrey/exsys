var chartColors = {
    "negative":[
        "#6B0F1A",
        "#F45B69",
        "#D11149",
        "#6A2E35",
        "#31081F",
    ],
    "neutral":[
        "#072AC8",
        "#1E96FC",
        "#A2D6F9",
        "#FCF300",
        "#FFC600"
    ],
    "positive":[
        "#B6D094",
        "#499167",
        "#5FDD9D",
        "#76F7BF",
        "#91F9E5"
    ]
}

function LineChart(title, xLabel, yLabel, labels, datasets) {

    const config = {
        type: 'line',
        data: {
            labels: labels,
            datasets: []
        },
        options: {
            responsive: true,
            title: {
                display: true,
                text: title
            },
            tooltips: {
                mode: 'index',
                intersect: false,
            },
            hover: {
                mode: 'nearest',
                intersect: true
            },
            scales: {
                xAxes: [{
                    display: true,
                    scaleLabel: {
                        display: true,
                        labelString: xLabel
                    }
                }],
                yAxes: [{
                    display: true,
                    scaleLabel: {
                        display: true,
                        labelString: yLabel
                    }
                }]
            }
        }
    };



    datasets =    datasets.sort(function(a, b) {
        return a.label.localeCompare(b.label);
    });

    datasets.forEach((v, k) => {
        const color = chartColors[v.color][k % chartColors[v.color].length];
        config.data.datasets.push({
            label: v.label,
            backgroundColor: color,
            borderColor: color,
            data: v.data,
            fill: false,
        })
    });

    const chart = document.createElement("canvas");
    document.body.appendChild(chart);
    
    return new Chart(chart.getContext('2d'), config);
};
