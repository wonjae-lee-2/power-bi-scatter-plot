/*
*  Power BI Visual CLI
*
*  Copyright (c) Microsoft Corporation
*  All rights reserved.
*  MIT License
*
*  Permission is hereby granted, free of charge, to any person obtaining a copy
*  of this software and associated documentation files (the ""Software""), to deal
*  in the Software without restriction, including without limitation the rights
*  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
*  copies of the Software, and to permit persons to whom the Software is
*  furnished to do so, subject to the following conditions:
*
*  The above copyright notice and this permission notice shall be included in
*  all copies or substantial portions of the Software.
*
*  THE SOFTWARE IS PROVIDED *AS IS*, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
*  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
*  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
*  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
*  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
*  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
*  THE SOFTWARE.
*/
"use strict";

import "./../style/visual.less";
import powerbi from "powerbi-visuals-api";

import IVisual = powerbi.extensibility.visual.IVisual;
import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;

import * as d3 from "d3";
type Selection<T1, T2 = T1> = d3.Selection<any, T1, any, T2>;

import * as aq from "arquero";
import ColumnTable from "arquero/dist/types/table/column-table";

export class Visual implements IVisual {

    private target: HTMLElement;
    private button: HTMLElement;
    private regionSelect: HTMLSelectElement;
    private operationSelect: HTMLSelectElement;
    private xSelect: HTMLSelectElement;
    private ySelect: HTMLSelectElement;

    private svg: Selection<any>;
    private chart: Selection<SVGElement>;
    private highlightRegion: Selection<SVGElement>;
    private highlightOperation: Selection<SVGElement>;
    private dataLabel: Selection<SVGElement>;
    private averageLines: Selection<SVGElement>;
    private xAxis: Selection<SVGElement>;
    private yAxis: Selection<SVGElement>;
    private grid: Selection<SVGElement>;

    private appendDropdown(labelText: string, labelPositionTop: string, labelPositionLeft: string, selectId: string) {

        let label = document.createElement("label");
        let select = document.createElement("select");

        label.innerText = labelText;
        label.style.position = "absolute";
        label.style.top = labelPositionTop;
        label.style.left = labelPositionLeft;
        select.id = selectId;
        label.appendChild(select);
        this.target.appendChild(label);

        return select;

    }

    private addDropdownOptions(options: VisualUpdateOptions, element: HTMLSelectElement) {

        let optionValue = element.value;
        let dataViews = options.dataViews;

        while (element.firstChild) {
            element.removeChild(element.firstChild);
        }

        switch (element) {

            case this.regionSelect: {

                let option = document.createElement("option");
                option.value = "";
                option.text = "--Select a region to highlight--";
                element.add(option);

                let regions = dataViews[0].categorical.categories[1].values;
                let regionsUniqueAsc = [...new Set(regions)].sort(d3.ascending);

                for (let i = 0; i < regionsUniqueAsc.length; i++) {

                    let option = document.createElement("option");
                    option.value = regionsUniqueAsc[i].valueOf() as string;
                    option.text = regionsUniqueAsc[i].valueOf() as string;
                    element.add(option);

                    if (option.value == optionValue) {
                        element.value = option.value;
                    }

                }

                break;

            }

            case this.operationSelect: {

                let option = document.createElement("option");
                option.value = "";
                option.text = "--Select an operation to highlight--";
                element.add(option);

                let operations = dataViews[0].categorical.categories[2].values;
                let operationsUniqueAsc = [...new Set(operations)].sort(d3.ascending);

                for (let i = 0; i < operationsUniqueAsc.length; i++) {

                    let option = document.createElement("option");
                    option.value = operationsUniqueAsc[i].valueOf() as string;
                    option.text = operationsUniqueAsc[i].valueOf() as string;
                    element.add(option);

                    if (option.value == optionValue) {
                        element.value = option.value;
                    }

                }

                break;

            }

            default: {

                let values = dataViews[0].categorical.values;
                let displayNames = [];

                for (let i = 0; i < values.length; i++) {
                    displayNames.push(values[i].source.displayName);
                }

                displayNames.sort(d3.ascending);
                for (let i = 0; i < displayNames.length; i++) {

                    let option = document.createElement("option");
                    option.value = displayNames[i];
                    option.text = displayNames[i];
                    element.add(option);

                    if (option.value == optionValue) {
                        element.value = option.value;
                    }

                }

                break;

            }

        }

    }

    private transformData(options: VisualUpdateOptions): ColumnTable {

        let dataViews = options.dataViews;
        let yearValues = dataViews[0].categorical.categories[0].values;
        let regionValues = dataViews[0].categorical.categories[1].values;
        let operationValues = dataViews[0].categorical.categories[2].values;
        let measures = dataViews[0].categorical.values;

        let xValues = [];
        let yValues = [];

        for (let i = 0; i < measures.length; i++) {

            if (measures[i].source.displayName == this.xSelect.value) {
                xValues = measures[i].values;
            }

            if (measures[i].source.displayName == this.ySelect.value) {
                yValues = measures[i].values;
            }

        }

        let yearValuesUnique = [...new Set(yearValues)];
        let dt;

        if (yearValuesUnique.length == 1) {

            dt = aq.table({
                "region": regionValues,
                "operation": operationValues,
                "x": xValues,
                "y": yValues
            })
                .impute({ x: () => 0, y: () => 0 })

        } else {

            dt = aq.table({
                "year": yearValues,
                "region": regionValues,
                "operation": operationValues,
                "x": xValues,
                "y": yValues
            });

            let minYear = aq.agg(dt, d => aq.op.min(d.year));
            let maxYear = aq.agg(dt, d => aq.op.max(d.year));

            dt = dt.params({ minYear: minYear, maxYear: maxYear })
                .filter((d, $) => d.year == $.minYear || d.year == $.maxYear)
                .impute({ x: () => 0, y: () => 0 })
                .groupby("region", "operation")
                .pivot("year", ["x", "y"])
                .derive({
                    x: (d, $) => d[`x_${$.maxYear}`] - d[`x_${$.minYear}`],
                    y: (d, $) => d[`y_${$.maxYear}`] - d[`y_${$.minYear}`]
                })
                .select("region", "operation", "x", "y");

        }

        return dt;

    }

    private drawChart(options: VisualUpdateOptions) {

        this.addDropdownOptions(options, this.regionSelect);
        this.addDropdownOptions(options, this.operationSelect);
        this.addDropdownOptions(options, this.xSelect);
        this.addDropdownOptions(options, this.ySelect);

        let width: number = options.viewport.width;
        let height: number = options.viewport.height;
        let marginLeft = 40;
        let marginRight = 80;
        let marginTop = 120;
        let marginBottom = 20;
        let xRange = [marginLeft, width - marginRight];
        let yRange = [height - marginBottom, marginTop];

        let data = this.transformData(options);
        let indices = d3.range(0, data.numRows());
        let dataRegion = data.getter("region");
        let dataOperation = data.getter("operation");
        let dataX = data.getter("x");
        let dataY = data.getter("y");
        let indicesHighlightRegion = d3.filter(indices, d => dataRegion(d) == this.regionSelect.value);
        let indicesHighlightOperation = d3.filter(indices, d => dataOperation(d) == this.operationSelect.value);
        let xLabel: string = this.xSelect.value;
        let yLabel: string = this.ySelect.value;
        let [domains] = data
            .rollup({
                x: d => [aq.op.min(d.x), aq.op.max(d.x)],
                y: d => [aq.op.min(d.y), aq.op.max(d.y)]
            });
        let xScale = d3.scaleLinear(domains["x"], xRange);
        let yScale = d3.scaleLinear(domains["y"], yRange);
        let [means] = data
            .rollup({
                x: d => aq.op.mean(d.x),
                y: d => aq.op.mean(d.y)
            });
        let xMean = [means["x"]];
        let yMean = [means["y"]];

        let xAxisFunction = (xScale) => d3.axisBottom(xScale).ticks(5, "~s");
        let yAxisFunction = (yScale) => d3.axisLeft(yScale).ticks(5, "~s");
        let xGrid = (g, xScale) => g
            .selectAll(".xGrid")
            .data(xScale.ticks(5))
            .join(
                enter => enter.append("line")
                    .attr("y1", marginTop / 2)
                    .attr("y2", height - (marginBottom / 2))
                    .classed("xGrid", true),
                update => update,
                exit => exit.remove()
            )
            .attr("x1", d => xScale(d))
            .attr("x2", d => xScale(d));
        let yGrid = (g, yScale) => g
            .selectAll(".yGrid")
            .data(yScale.ticks(5))
            .join(
                enter => enter.append("line")
                    .attr("x1", marginLeft / 2)
                    .attr("x2", width - (marginRight / 2))
                    .classed("yGrid", true),
                update => update,
                exit => exit.remove()
            )
            .attr("y1", d => yScale(d))
            .attr("y2", d => yScale(d));
        let xAverageLine = (g, xScale) => g
            .selectAll(".xAverageLine")
            .data(xMean)
            .join(
                enter => enter.append("line")
                    .attr("y1", marginTop / 2)
                    .attr("y2", height - (marginBottom / 2))
                    .classed("xAverageLine", true),
                update => update,
                exit => exit.remove()
            )
            .attr("x1", d => xScale(d))
            .attr("x2", d => xScale(d));
        let yAverageLine = (g, yScale) => g
            .selectAll(".yAverageLine")
            .data(yMean)
            .join(
                enter => enter.append("line")
                    .attr("x1", marginLeft / 2)
                    .attr("x2", width - (marginRight / 2))
                    .classed("yAverageLine", true),
                update => update,
                exit => exit.remove()
            )
            .attr("y1", d => yScale(d))
            .attr("y2", d => yScale(d));
        let zoom = d3.zoom().scaleExtent([0, Infinity]).on("zoom", (event) => {

            let transform = event.transform;
            let xScaleZoomed = transform.rescaleX(xScale);
            let yScaleZoomed = transform.rescaleY(yScale);

            this.grid
                .call(xGrid, xScaleZoomed)
                .call(yGrid, yScaleZoomed);

            this.xAxis
                .attr("transform", `translate(0, ${height - marginBottom})`)
                .call(xAxisFunction(xScaleZoomed))
                .call(g => g.selectAll(".domain, .xlabel").remove())
                .call(g => g.append("text")
                    .attr("x", width - (marginRight / 4))
                    .attr("y", marginBottom / 4)
                    .attr("fill", "black")
                    .attr("font-weight", "600")
                    .attr("text-anchor", "end")
                    .text(xLabel)
                    .classed("xlabel", true)
                );

            this.yAxis
                .attr("transform", `translate(${marginLeft}, 0)`)
                .call(yAxisFunction(yScaleZoomed))
                .call(g => g.selectAll(".domain, .ylabel").remove())
                .call(g => g.append("text")
                    .attr("x", -marginLeft * (3 / 4))
                    .attr("y", marginTop / 2)
                    .attr("fill", "black")
                    .attr("font-weight", "600")
                    .attr("text-anchor", "start")
                    .text(yLabel)
                    .classed("ylabel", true)
                );

            this.averageLines
                .call(xAverageLine, xScaleZoomed)
                .call(yAverageLine, yScaleZoomed);

            this.chart
                .attr("transform", transform)
                .attr("stroke-width", 5 / transform.k);

            this.dataLabel
                .attr("transform", transform)
                .attr("font-size", 14 / transform.k);

            this.highlightRegion
                .selectAll("path")
                .attr("transform", transform)
                .attr("stroke-width", 10 / transform.k);

            this.highlightOperation
                .selectAll("path")
                .attr("transform", transform)
                .attr("stroke-width", 10 / transform.k);
            this.highlightOperation
                .selectAll("text")
                .attr("transform", transform)
                .attr("font-size", 14 / transform.k);

        });

        this.svg.
            attr("viewBox", [0, 0, width, height]);

        this.grid
            .attr("stroke", "black")
            .attr("stroke-opacity", 0.1);

        this.averageLines
            .attr("stroke", "#76b7b2")
            .attr("stroke-width", "2")
            .attr("stroke-dasharray", "4 2");

        this.chart
            .attr("stroke", "black")
            .attr("stroke-linecap", "round")
            .attr("opacity", 0.2)
            .selectAll("path")
            .data(indices)
            .join("path")
            .attr("d", d => `M ${xScale(dataX(d))} ${yScale(dataY(d))} h 0`);

        this.dataLabel
            .attr("color", "black")
            .attr("stroke-width", 0)
            .attr("font-weight", "600")
            .attr("opacity", 0.2)
            .selectAll("text")
            .data(indices)
            .join("text")
            .attr("dx", "0.5em")
            .attr("dy", "0.5em")
            .attr("x", d => xScale(dataX(d)))
            .attr("y", d => yScale(dataY(d)))
            .text(d => dataOperation(d));

        this.highlightRegion
            .selectAll("path")
            .data(indicesHighlightRegion)
            .join("path")
            .attr("stroke", "#4e79a7")
            .attr("stroke-linecap", "round")
            .attr("d", d => `M ${xScale(dataX(d))} ${yScale(dataY(d))} h 0`);

        this.highlightOperation
            .selectAll("path")
            .data(indicesHighlightOperation)
            .join("path")
            .attr("stroke", "#e15759")
            .attr("stroke-linecap", "round")
            .attr("d", d => `M ${xScale(dataX(d))} ${yScale(dataY(d))} h 0`);
        this.highlightOperation
            .selectAll("text")
            .data(indicesHighlightOperation)
            .join("text")
            .attr("color", "black")
            .attr("stroke-width", 0)
            .attr("font-weight", "600")
            .attr("dx", "0.5em")
            .attr("dy", "0.5em")
            .attr("x", d => xScale(dataX(d)))
            .attr("y", d => yScale(dataY(d)))
            .text(d => dataOperation(d));

        this.svg
            .call(zoom)
            .transition()
            .duration(750)
            .call(zoom.transform, d3.zoomIdentity);

        this.button.onclick = () => {
            this.svg
                .transition()
                .duration(750)
                .call(zoom.transform, d3.zoomIdentity);
        }

    }

    constructor(options: VisualConstructorOptions) {

        this.target = options.element;

        this.button = document.createElement("button");
        this.button.innerHTML = "Re-center";
        this.button.style.position = "absolute";
        this.button.style.top = "15px";
        this.button.style.left = "10%";
        this.target.appendChild(this.button);

        this.regionSelect = this.appendDropdown("Region: ", "0px", "25%", "regionSelect");
        this.operationSelect = this.appendDropdown("Operation: ", "30px", "25%", "operationSelect");
        this.xSelect = this.appendDropdown("X: ", "0px", "60%", "xSelect");
        this.ySelect = this.appendDropdown("Y: ", "30px", "60%", "ySelect");

        this.svg = d3.select(options.element)
            .append("svg")
            .classed("svg", true);
        this.chart = this.svg
            .append("g")
            .classed("chart", true);
        this.highlightRegion = this.svg
            .append("g")
            .classed("highlightRegion", true);
        this.highlightOperation = this.svg
            .append("g")
            .classed("highlightOperation", true);
        this.dataLabel = this.svg
            .append("g")
            .classed("dataLabel", true);
        this.averageLines = this.svg
            .append("g")
            .classed("averageLines", true);
        this.xAxis = this.svg
            .append("g")
            .classed("xAxis", true);
        this.yAxis = this.svg
            .append("g")
            .classed("yAxis", true);
        this.grid = this.svg
            .append("g")
            .classed("grid", true);

    }

    public update(options: VisualUpdateOptions) {

        this.drawChart(options);

        this.regionSelect.onchange = () => {
            this.drawChart(options);
        }

        this.operationSelect.onchange = () => {
            this.drawChart(options);
        }

        this.xSelect.onchange = () => {
            this.drawChart(options);
        }

        this.ySelect.onchange = () => {
            this.drawChart(options);
        }

    }

}