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
import { Select } from "arquero/dist/types/table/transformable";

import { linearRegression, linearRegressionLine } from "simple-statistics";

interface dataModel {
    operations: ColumnTable;
    regions: ColumnTable;
    global: ColumnTable;
}

export class Visual implements IVisual {

    private cardLeft: HTMLDivElement;
    private filterYear1: HTMLDivElement;
    private filterYear2: HTMLDivElement;
    private chartViewIconArea: HTMLDivElement;
    private chartViewSelectRegion: HTMLSelectElement;
    private chartViewSelectOperation: HTMLSelectElement;
    private chartViewSelectX: HTMLSelectElement;
    private chartViewSelectY: HTMLSelectElement;
    private settingsGridView: HTMLDivElement;
    private settingsChartView: HTMLDivElement;
    private CheckboxLinearRegression: HTMLInputElement;
    private CheckboxGlobalAverage: HTMLInputElement;
    private CheckboxRegionalAverages: HTMLInputElement;
    private chartViewCardRight: HTMLDivElement;
    private menuContainer1: HTMLDivElement;
    private menuContainer2: HTMLDivElement;
    private menuContainer3: HTMLDivElement;

    private chartViewSvg: Selection<any>;
    private grid: Selection<SVGElement>;
    private regressionArea: Selection<SVGElement>;
    private regressionLine: Selection<SVGElement>;
    private xAxis: Selection<SVGElement>;
    private yAxis: Selection<SVGElement>;
    private chartArea: Selection<SVGElement>;
    private chart: Selection<SVGElement>;
    private label: Selection<SVGElement>;
    private chartOutlier: Selection<SVGElement>;
    private chartGlobalAverage: Selection<SVGElement>;
    private labelGlobalAverage: Selection<SVGElement>;
    private chartRegionalAverages: Selection<SVGElement>;
    private labelRegionalAverages: Selection<SVGElement>;
    private chartHighlightRegion: Selection<SVGElement>;
    private labelHighlightRegion: Selection<SVGElement>;
    private chartHighlightOperation: Selection<SVGElement>;
    private labelHighlightOperation: Selection<SVGElement>;
    private tooltip: d3.Selection<HTMLElement, unknown, null, undefined>;

    private selectMenuItem(itemNumber: number) {

        let containers = document.getElementsByClassName("menuContainer") as HTMLCollectionOf<HTMLDivElement>;
        let blackIcons = document.getElementsByClassName("menuIconBlack") as HTMLCollectionOf<HTMLImageElement>;
        let whiteIcons = document.getElementsByClassName("menuIconWhite") as HTMLCollectionOf<HTMLImageElement>;
        let texts = document.getElementsByClassName("menuText") as HTMLCollectionOf<HTMLDivElement>;
        let index = itemNumber - 1;

        for (let i = 0; i < containers.length; i++) {
            containers[i].style.background = "none";
            blackIcons[i].style.visibility = "visible";
            whiteIcons[i].style.visibility = "hidden";
            texts[i].style.color = "#000000";
        }

        containers[index].style.background = "#0C105A";
        blackIcons[index].style.visibility = "hidden";
        whiteIcons[index].style.visibility = "visible";
        texts[index].style.color = "#FFFFFF";

        switch (itemNumber) {
            case 1:
                this.cardLeft.style.visibility = "visible";
                this.chartViewCardRight.style.visibility = "hidden";
                this.settingsGridView.style.visibility = "hidden";
                this.settingsChartView.style.visibility = "hidden";

                this.regressionArea.attr("visibility", "hidden");
                this.regressionLine.selectAll("line").attr("visibility", "hidden");
                this.chartGlobalAverage.selectAll("path").attr("visibility", "hidden");
                this.labelGlobalAverage.selectAll("text").attr("visibility", "hidden");
                this.chartRegionalAverages.selectAll("path").attr("visibility", "hidden");
                this.labelRegionalAverages.selectAll("text").attr("visibility", "hidden");

                break;
            case 2:
                this.cardLeft.style.visibility = "visible";
                this.chartViewCardRight.style.visibility = "visible";
                this.settingsGridView.style.visibility = "hidden";
                this.settingsChartView.style.visibility = "hidden";

                if (this.CheckboxLinearRegression.checked) {
                    this.regressionArea.attr("visibility", "visible");
                    this.regressionLine.selectAll("line").attr("visibility", "visible");
                } else {
                    this.regressionArea.attr("visibility", "hidden");
                    this.regressionLine.selectAll("line").attr("visibility", "hidden");
                }

                if (this.CheckboxGlobalAverage.checked) {
                    this.chartGlobalAverage.selectAll("path").attr("visibility", "visible");
                    this.labelGlobalAverage.selectAll("text").attr("visibility", "visible");
                } else {
                    this.chartGlobalAverage.selectAll("path").attr("visibility", "hidden");
                    this.labelGlobalAverage.selectAll("text").attr("visibility", "hidden");
                }

                if (this.CheckboxRegionalAverages.checked) {
                    this.chartRegionalAverages.selectAll("path").attr("visibility", "visible");
                    this.labelRegionalAverages.selectAll("text").attr("visibility", "visible");
                } else {
                    this.chartRegionalAverages.selectAll("path").attr("visibility", "hidden");
                    this.labelRegionalAverages.selectAll("text").attr("visibility", "hidden");
                }

                break;
            case 3:
                this.cardLeft.style.visibility = "hidden";
                this.chartViewCardRight.style.visibility = "hidden";
                this.settingsGridView.style.visibility = "visible";
                this.settingsChartView.style.visibility = "visible";

                this.regressionArea.attr("visibility", "hidden");
                this.regressionLine.selectAll("line").attr("visibility", "hidden");
                this.chartGlobalAverage.selectAll("path").attr("visibility", "hidden");
                this.labelGlobalAverage.selectAll("text").attr("visibility", "hidden");
                this.chartRegionalAverages.selectAll("path").attr("visibility", "hidden");
                this.labelRegionalAverages.selectAll("text").attr("visibility", "hidden");

                break;
        }

    }

    private drawChart(dataModel: dataModel) {

        let width = 740; //options.viewport.width;
        let height = 495; //options.viewport.height;
        let marginLeft = 50;
        let marginRight = 40;
        let marginTop = 30;
        let marginBottom = 30;
        let paddingLeft = 20;
        let paddingRight = 20;
        let paddingTop = 20;
        let paddingBottom = 20;
        let xRange = [marginLeft + paddingLeft, width - marginRight - paddingRight];
        let yRange = [height - marginBottom - paddingBottom, marginTop + paddingTop];

        let data = dataModel.operations;
        let indices = d3.range(0, data.numRows());
        let dataRegion = data.getter("Region");
        let dataOperation = data.getter("Operation");
        let dataX = data.getter("x");
        let dataY = data.getter("y");
        let dataYhat = data.getter("yhat");
        let dataLower = data.getter("lower");
        let dataUpper = data.getter("upper");
        let dataLower2 = data.getter("lower2");
        let dataUpper2 = data.getter("upper2");
        let indicesRegression = [0, data.numRows() - 1];
        let indicesChartOutlier = d3.filter(indices, d => dataY(d) < dataLower2(d) || dataUpper2(d) < dataY(d));
        let indicesHighlightRegion = d3.filter(indices, d => dataRegion(d) == this.chartViewSelectRegion.value);
        let indicesHighlightOperation = d3.filter(indices, d => dataOperation(d) == this.chartViewSelectOperation.value);

        let dataRegionalAverages = dataModel.regions;
        let indicesRegionalAverages = d3.range(0, dataRegionalAverages.numRows());
        let dataRegionalAveragesRegion = dataRegionalAverages.getter("Region");
        let dataRegionalAveragesX = dataRegionalAverages.getter("x");
        let dataRegionalAveragesY = dataRegionalAverages.getter("y");

        let dataGlobalAverage = dataModel.global;
        let indicesGlobalAverage = d3.range(0, dataGlobalAverage.numRows());
        let dataGlobalAverageRegion = dataGlobalAverage.getter("Region");
        let dataGlobalAverageX = dataGlobalAverage.getter("x");
        let dataGlobalAverageY = dataGlobalAverage.getter("y");

        let [domains] = data
            .rollup({
                x: d => [aq.op.min(d.x), aq.op.max(d.x)],
                y: d => [aq.op.min(d.y), aq.op.max(d.y)]
            });
        let xScale;
        if (domains["x"][0] == 0 && domains["x"][1] == 0) {
            xScale = d3.scaleLinear([-1, 1], xRange);
        } else {
            xScale = d3.scaleLinear(domains["x"], xRange);
        }
        let yScale;
        if (domains["y"][0] == 0 && domains["y"][1] == 0) {
            yScale = d3.scaleLinear([-1, 1], yRange);
        } else {
            yScale = d3.scaleLinear(
                [
                    d3.min([domains["y"][0], aq.agg(data, aq.op.min("lower"))]),
                    d3.max([domains["y"][1], aq.agg(data, aq.op.max("upper"))])
                ],
                yRange
            );
        }
        let xLabel: string;
        if (this.chartViewSelectX.value == "") {
            xLabel = "";
        } else {
            xLabel = this.chartViewSelectX.value;
        }
        let yLabel: string;
        if (this.chartViewSelectY.value == "") {
            yLabel = "";
        } else {
            yLabel = this.chartViewSelectY.value;
        }

        let xAxisFunction = (xScale) => d3.axisBottom(xScale).ticks(7, "~s");
        let yAxisFunction = (yScale) => d3.axisLeft(yScale).ticks(5, "~s");
        let xGrid = (g, xScale) => g
            .selectAll(".xGrid")
            .data(xScale.ticks(7))
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

        let zoom = d3.zoom().scaleExtent([0, Infinity]).on("zoom", (event) => {

            let transform = event.transform;
            let xScaleZoomed = transform.rescaleX(xScale);
            let yScaleZoomed = transform.rescaleY(yScale);

            let area = d3.area<number>()
                .curve(d3.curveLinear)
                .x(d => xScale(dataX(d)))
                .y0(d => yScale(dataLower(d)))
                .y1(d => yScale(dataUpper(d)))

            let formatNumber = d3.format(",.2f")
            let pointerEntered = (d, dataText, dataX, dataY) => {

                this.tooltip
                    .append("div")
                    .append("b")
                    .text(`${dataText(d)}`);
                if (dataX(d) !== 0) {
                    this.tooltip
                        .append("div")
                        .text(`${xLabel}: ${formatNumber(dataX(d))}`);
                }
                if (dataY(d) !== 0) {
                    this.tooltip
                        .append("div")
                        .text(`${yLabel}: ${formatNumber(dataY(d))}`);
                }
                this.tooltip.style("visibility", "visible");

            }
            let pointerMoved = (d, dataX, dataY) => {

                let tooltipWidth = this.tooltip.property("offsetWidth");
                let tooltipHeight = this.tooltip.property("offsetHeight");
                if (xScaleZoomed(dataX(d)) - (tooltipWidth / 2) < 0) {
                    this.tooltip
                        .style("left", `${xScaleZoomed(dataX(d)) + 20}px`)
                        .style("top", `${yScaleZoomed(dataY(d)) - (tooltipHeight * 1.2) + 75}px`);
                } else if (xScaleZoomed(dataX(d)) + (tooltipWidth / 2) > width) {
                    this.tooltip
                        .style("left", `${xScaleZoomed(dataX(d)) - tooltipWidth + 20}px`)
                        .style("top", `${yScaleZoomed(dataY(d)) - (tooltipHeight * 1.2) + 75}px`);
                } else {
                    this.tooltip
                        .style("left", `${xScaleZoomed(dataX(d)) - (tooltipWidth / 2) + 20}px`)
                        .style("top", `${yScaleZoomed(dataY(d)) - (tooltipHeight * 1.2) + 75}px`);
                }

            }
            let pointerLeft = () => {

                this.tooltip.style("visibility", "hidden");
                this.tooltip
                    .selectChildren()
                    .remove();

            }

            this.grid
                .call(xGrid, xScaleZoomed)
                .call(yGrid, yScaleZoomed);

            this.regressionArea
                .attr("d", area(indicesRegression))
                .attr("transform", transform);

            this.regressionLine
                .selectAll("line")
                .data([indicesRegression])
                .join("line")
                .attr("x1", d => xScale(dataX(d[0])))
                .attr("x2", d => xScale(dataX(d[1])))
                .attr("y1", d => yScale(dataYhat(d[0])))
                .attr("y2", d => yScale(dataYhat(d[1])))
                .attr("transform", transform)
                .attr("stroke-width", 2 / transform.k);

            this.xAxis
                .attr("transform", `translate(0, ${height - marginBottom})`)
                .call(xAxisFunction(xScaleZoomed))
                .call(g => g.selectAll(".domain, .xLabel").remove())
                .call(g => g.append("text")
                    .attr("x", width - (marginRight / 4))
                    .attr("y", -marginBottom / 4)
                    .text(xLabel)
                    .classed("xLabel", true)
                );

            this.yAxis
                .attr("transform", `translate(${marginLeft}, 0)`)
                .call(yAxisFunction(yScaleZoomed))
                .call(g => g.selectAll(".domain, .yLabel").remove())
                .call(g => g.append("text")
                    .attr("x", -marginLeft * (3 / 4))
                    .attr("y", marginTop / 2)
                    .text(yLabel)
                    .classed("yLabel", true)
                );

            this.chart
                .selectAll("path")
                .data(indices)
                .join("path")
                .attr("d", d => `M ${xScale(dataX(d))} ${yScale(dataY(d))} h 0`)
                .attr("transform", transform)
                .attr("stroke-width", 6 / transform.k)
                .on("pointerenter", (event, d) => pointerEntered(d, dataOperation, dataX, dataY))
                .on("pointermove", (event, d) => pointerMoved(d, dataX, dataY))
                .on("pointerleave", () => pointerLeft());

            this.label
                .selectAll("text")
                .data(indices)
                .join("text")
                .text(d => dataOperation(d))
                .attr("x", d => xScale(dataX(d)))
                .attr("y", d => yScale(dataY(d)))
                .attr("dy", "1.4em")
                .attr("transform", transform)
                .attr("font-size", 12 / transform.k)
                .on("pointerenter", (event, d) => pointerEntered(d, dataOperation, dataX, dataY))
                .on("pointermove", (event, d) => pointerMoved(d, dataX, dataY))
                .on("pointerleave", () => pointerLeft());

            this.chartOutlier
                .selectAll("path")
                .data(indicesChartOutlier)
                .join("path")
                .attr("d", d => `M ${xScale(dataX(d))} ${yScale(dataY(d))} h 0`)
                .attr("transform", transform)
                .attr("stroke-width", 9 / transform.k)
                .on("pointerenter", (event, d) => pointerEntered(d, dataOperation, dataX, dataY))
                .on("pointermove", (event, d) => pointerMoved(d, dataX, dataY))
                .on("pointerleave", () => pointerLeft());

            this.chartRegionalAverages
                .selectAll("path")
                .data(indicesRegionalAverages)
                .join("path")
                .attr("d", d => `M ${xScale(dataRegionalAveragesX(d))} ${yScale(dataRegionalAveragesY(d))} h 0`)
                .attr("transform", transform)
                .attr("stroke-width", 9 / transform.k)
                .on("pointerenter", (event, d) => pointerEntered(d, dataRegionalAveragesRegion, dataRegionalAveragesX, dataRegionalAveragesY))
                .on("pointermove", (event, d) => pointerMoved(d, dataRegionalAveragesX, dataRegionalAveragesY))
                .on("pointerleave", () => pointerLeft());

            this.labelRegionalAverages
                .selectAll("text")
                .data(indicesRegionalAverages)
                .join("text")
                .text(d => dataRegionalAveragesRegion(d))
                .attr("x", d => xScale(dataRegionalAveragesX(d)))
                .attr("y", d => yScale(dataRegionalAveragesY(d)))
                .attr("dy", "1.4em")
                .attr("transform", transform)
                .attr("font-size", 12 / transform.k)
                .on("pointerenter", (event, d) => pointerEntered(d, dataRegionalAveragesRegion, dataRegionalAveragesX, dataRegionalAveragesY))
                .on("pointermove", (event, d) => pointerMoved(d, dataRegionalAveragesX, dataRegionalAveragesY))
                .on("pointerleave", () => pointerLeft());

            this.chartGlobalAverage
                .selectAll("path")
                .data(indicesGlobalAverage)
                .join("path")
                .attr("d", d => `M ${xScale(dataGlobalAverageX(d))} ${yScale(dataGlobalAverageY(d))} h 0`)
                .attr("transform", transform)
                .attr("stroke-width", 9 / transform.k)
                .on("pointerenter", (event, d) => pointerEntered(d, dataGlobalAverageRegion, dataGlobalAverageX, dataGlobalAverageY))
                .on("pointermove", (event, d) => pointerMoved(d, dataGlobalAverageX, dataGlobalAverageY))
                .on("pointerleave", () => pointerLeft());

            this.labelGlobalAverage
                .selectAll("text")
                .data(indicesGlobalAverage)
                .join("text")
                .text(d => dataGlobalAverageRegion(d))
                .attr("x", d => xScale(dataGlobalAverageX(d)))
                .attr("y", d => yScale(dataGlobalAverageY(d)))
                .attr("dy", "1.4em")
                .attr("transform", transform)
                .attr("font-size", 12 / transform.k)
                .on("pointerenter", (event, d) => pointerEntered(d, dataGlobalAverageRegion, dataGlobalAverageX, dataGlobalAverageY))
                .on("pointermove", (event, d) => pointerMoved(d, dataGlobalAverageX, dataGlobalAverageY))
                .on("pointerleave", () => pointerLeft());

            this.chartHighlightRegion
                .selectAll("path")
                .data(indicesHighlightRegion)
                .join("path")
                .attr("d", d => `M ${xScale(dataX(d))} ${yScale(dataY(d))} h 0`)
                .attr("transform", transform)
                .attr("stroke-width", 9 / transform.k)
                .on("pointerenter", (event, d) => pointerEntered(d, dataOperation, dataX, dataY))
                .on("pointermove", (event, d) => pointerMoved(d, dataX, dataY))
                .on("pointerleave", () => pointerLeft());

            this.labelHighlightRegion
                .selectAll("text")
                .data(indicesHighlightRegion)
                .join("text")
                .text(d => dataOperation(d))
                .attr("x", d => xScale(dataX(d)))
                .attr("y", d => yScale(dataY(d)))
                .attr("dy", "1.4em")
                .attr("transform", transform)
                .attr("font-size", 12 / transform.k)
                .on("pointerenter", (event, d) => pointerEntered(d, dataOperation, dataX, dataY))
                .on("pointermove", (event, d) => pointerMoved(d, dataX, dataY))
                .on("pointerleave", () => pointerLeft());

            this.chartHighlightOperation
                .selectAll("path")
                .data(indicesHighlightOperation)
                .join("path")
                .attr("d", d => `M ${xScale(dataX(d))} ${yScale(dataY(d))} h 0`)
                .attr("transform", transform)
                .attr("stroke-width", 9 / transform.k)
                .on("pointerenter", (event, d) => pointerEntered(d, dataOperation, dataX, dataY))
                .on("pointermove", (event, d) => pointerMoved(d, dataX, dataY))
                .on("pointerleave", () => pointerLeft());

            this.labelHighlightOperation
                .selectAll("text")
                .data(indicesHighlightOperation)
                .join("text")
                .text(d => dataOperation(d))
                .attr("x", d => xScale(dataX(d)))
                .attr("y", d => yScale(dataY(d)))
                .attr("dy", "1.4em")
                .attr("transform", transform)
                .attr("font-size", 12 / transform.k)
                .on("pointerenter", (event, d) => pointerEntered(d, dataOperation, dataX, dataY))
                .on("pointermove", (event, d) => pointerMoved(d, dataX, dataY))
                .on("pointerleave", () => pointerLeft());

        });

        this.chartViewSvg.
            attr("viewBox", [0, 0, width, height]);

        this.chartViewSvg
            .call(zoom)
            .transition()
            .duration(750)
            .call(zoom.transform, d3.zoomIdentity);

        this.chartViewIconArea.onclick = () => {
            this.chartViewSvg
                .transition()
                .duration(750)
                .call(zoom.transform, d3.zoomIdentity);
        }

    }

    constructor(options: VisualConstructorOptions) {

        function appendDropdown(element: HTMLDivElement, selectPositionLeft: number, selectId: string): HTMLSelectElement {

            let container = document.createElement("div");
            let label = document.createElement("label");
            let select = document.createElement("select");

            container.style.left = `${selectPositionLeft}px`;
            container.className = "chartViewDropdownContainer";
            label.className = "chartViewDropdownLabel";
            label.htmlFor = selectId;
            select.className = "chartViewDropdownSelect";
            select.id = selectId;
            switch (selectId) {
                case "chartViewSelectRegion":
                    label.textContent = "Region"
                    break;
                case "chartViewSelectOperation":
                    label.textContent = "Operation"
                    break;
                case "chartViewSelectX":
                    label.textContent = "X Axis"
                    break;
                case "chartViewSelectY":
                    label.textContent = "Y Axis"
                    break;
            }

            container.appendChild(select);
            container.appendChild(label);
            element.appendChild(container);

            return select;

        }

        function appendCheckbox(list: HTMLDivElement, listItemTop: number, checkboxId: string, labelText: string): HTMLInputElement {

            let settingsListItem = document.createElement("div");
            let checkbox = document.createElement("input");
            let label = document.createElement("label");

            checkbox.type = "checkbox";
            checkbox.id = checkboxId;
            label.htmlFor = checkboxId;
            label.textContent = ` ${labelText}`;
            settingsListItem.className = "settingsListItem";
            settingsListItem.style.top = `${listItemTop}px`
            settingsListItem.appendChild(checkbox);
            settingsListItem.appendChild(label);
            list.appendChild(settingsListItem);

            return checkbox;

        }

        function appendMenuItem(target: HTMLElement, blackIcon: string, whiteIcon: string, textContent: string): HTMLDivElement {

            let menuIconBlack = document.createElement("img");
            menuIconBlack.className = "menuIconBlack";
            menuIconBlack.src = blackIcon

            let menuIconWhite = document.createElement("img");
            menuIconWhite.className = "menuIconWhite";
            menuIconWhite.src = whiteIcon

            let menuText = document.createElement("div");
            menuText.className = "menuText";
            menuText.innerHTML = textContent;

            let itemNumber = document.getElementsByClassName("menuContainer").length + 1;
            let menuContainer = document.createElement("div");
            menuContainer.className = "menuContainer";
            menuContainer.style.top = `${50 + (50 * itemNumber) - 5}px`;

            menuContainer.appendChild(menuIconBlack);
            menuContainer.appendChild(menuIconWhite);
            menuContainer.appendChild(menuText);
            target.appendChild(menuContainer);

            return menuContainer;

        }

        function appendFilterItem(element: HTMLDivElement, titleText: string) {

            let filterYearTitle = document.createElement("div");
            filterYearTitle.className = "filterYearTitle";
            filterYearTitle.innerHTML = titleText;
            element.appendChild(filterYearTitle);

            let firstYear = 2017;
            let inputName = titleText.replace(" ", "").toLowerCase();
            for (let i = 0; i < 6; i++) {
                let filterYearItem = document.createElement("div");
                let filterYearItemInput = document.createElement("input");
                let filterYearItemLabel = document.createElement("label");

                filterYearItem.className = "filterYearItem";
                filterYearItem.style.top = `${40 + (30 * i)}px`;

                filterYearItemInput.className = "filterYearInput";
                filterYearItemInput.type = "radio";
                filterYearItemInput.id = `${inputName}Choice${i + 1}`;
                filterYearItemInput.name = inputName;
                filterYearItemInput.value = `${firstYear + i}`;
                if (i == 5) {
                    filterYearItemInput.checked = true;
                }

                filterYearItemLabel.className = "filterYearLabel";
                filterYearItemLabel.htmlFor = `${inputName}Choice${i + 1}`;
                filterYearItemLabel.innerHTML = `${firstYear + i}`;

                filterYearItem.appendChild(filterYearItemInput);
                filterYearItem.appendChild(filterYearItemLabel);
                element.appendChild(filterYearItem);

            }
        }

        let target = options.element;

        this.menuContainer1 = appendMenuItem(
            target,
            "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAB4AAAAeCAYAAAA7MK6iAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAMBSURBVEhLvZe7alVBGIVnZu+j8QkMShQVLMRHEF8ghVYWdvYBKx9CSxUEK3tBrHwCSwu1lYAKMSQgyUELTfbFb83Zs7Mv5zJTmAUri5k986/55/JzYo0x1jn3qKqqB9batbquDUr3CDXc4ftD9BN0sGr0hnP2aVXVl1CDGmKiVUd9/1/ar2g/YY65BWs6avxQiy7lR8ZPYNYoU+2H2VynxS1Vjcvz/LZWu0GHqevKZ0rCq3ANapTmljBnznVrhxmONXgURXFVkycJpgGtKSw0N9ZUHrRZpjHHiaaCztabShU01lTw/SgZzzoSoPP1ppCFx5sK9Ou83XHTjgIxhNYUTlJMBb47xx8FiIJM9dxAaypNMRX4jrNzuiQrEUwVDChjbypNMRUY5zPWeS3FiamC+2itqTTFVFCyLsuyP017LvqmPriyPYKtOWZHsaYCcfyIdQbvwmGF4uZJRxXoBTwDtedewfPZuHGMOdxjznlN1kVZh3cInLOaXFlJ6SuavqBf6XsHtUvd7a7YubtlWfoqyDjVf8TfIWmGlqh26y3ck7HOWO85FPy2IjXanuUCDeOkihXiSBVf0E71PPSn1wH/uynMNVgDTtUUFmqcuqk0ZLsBN7kAa1wAX0fREsn6anZ5UW8Yq3ld05zLtcnlusJYXSJdJsRfsrpRXTpdSl3Ob9BcgHsagA6fTk/1ZHgOL2lrscpcxhP6nnWey4iDZ7kPL0Jzb5lZ0JN3ag7o0/v1plKC/xyaBS6oBfdRd5Yt6NXaofYrktU5Dc9UCxiBKcOqF/RcOMtI0xZd07lYYipVQfIXJ8VUUE8wHX1dYSrNFmYcWfD1Vdm3iDCV+lo6yjjRVFvuEWkq9Y9N+51qKgRTn3GCqdRn3P6CSDDV+QbTcjYnzlQeqFXG/hdEgqnQmkJ+3sabyoN2rcnfE023oTLu1t4vsaby4F+YbVWfHT78ZhGX+fCLk5oSV9UJ9VWqq5/Jbgv9AduCD98z9ybfdHZTzA7Rw0YP0Cm7i9b7tB+XZfn6H2OoEtfLWXULAAAAAElFTkSuQmCC",
            "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAB4AAAAeCAYAAAA7MK6iAAAAAXNSR0IArs4c6QAAA3lJREFUSEvFl8+KnFUQxU/VnUg2DWo0BjGCK8GFoOLKYB4gC90oJJLR0SwEBUHxJVwoKIJgFk4gA7oQV76AWUUw5A1UUDGOOsIsTNL3HKnrvZ1vvvl6+roZe1P07T+/PreqTlWbJCP5rrtvSDpqZpCEiUcc/mRmbwG4DsABsMbHctaHKdnDpOBuIAl3H8RyfpPkZ+7+nkk6BeCbeKOZF6jZFHdxdt3Mnh5AM6mrZvaUNIbtfx6MnOenA3yW5FYnNOi7ZnYPgPh5GcCapG1Js70Kp6EhzN02ArwuYbNDaZMc4GMA5gGNSHLH3Wf7r/cOfCiM5KtVsbZWXO/w7pviyHGBS9iWuFTx+DbNrIDXJW0emNW9Lwb4PgC3q+LbJP9apngqhSQ3bD6fn3X3rV6whF13uxtAqvAjALbJ/YqX1Y2ZvRaKz0u61AOOLjOzXTOE4lsAAjqp+KBibYrPufvlVeAKjXZbqXhVh3QrvgMtVboL4H4AN6cUr4KGQJKvRI5fcPcvlikeQeND0TrRTtFKUWBHJPws8VgPNDhm9nLk+ISkawBOjOET0FD8CYCwzQKtOf7IzN/o9IIbZvZ4gOOXB/Q5kmvuvkZyHrGaQ5yFSUT8HsDXAP5u0BqZc34+pXSymkj4P93da0wkc3wPgK8A/BrgaIuh4RcbHDjTQtkI1s4XDlZbrA2OiM31Y8DsYQQ4rqu9+VCgIWyo+NCgcZtN8aFCm+K4+5MAzpA86u6qdZFJJndfxJzxS0r4suYuchv1EWlayzmfSSk9UosoiimKK4pMNUZHRFFGcf4Qih8EcI3k8b55yk/d/fVhIZF838ze7PSC3wA8EeAXSX7eB43txHbM8EBdAkqlSroB4N7Jfelff8doO3kpnOt8SulS7xAfbSClZST9AWDWaUDIOV+ID50jeXmZ4gkbbBtIFGTp0ynwEtdry1/x6qWKl3hvgONa2yoqSX8OFa+AhuIyjycVH2D4Q3BxJEm/N/AqaE1p2UD2KV4xZRp4YY1NcSd0obisty3HHaOtgctobYolzCaqd2KxLzO9KF5PKW3+h4V+WFzRTmEwO2Y+613oydzW2/9noX9GwpXOIR7X2/7CLPxd0rdm9mSvF+Scn42qjmH9trtfkHRX+Ex0Zu3RcfzRzN4B8N1oZj8q6WMze4ikjTyherXkbrdIXnT3D/4BvomuHhc+vZ8AAAAASUVORK5CYII=",
            "Grid View"
        )
        this.menuContainer2 = appendMenuItem(
            target,
            "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACgAAAAoCAYAAACM/rhtAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAGfSURBVFhH7Zi7SsRAFIbXVRFb7Wy0UrSw9BEULw+gr7Bor2yh72DrY3hBH8PGS6M2loJ2grf/I5tlDGfd7BxMFOaDjx0mJ9mfSTIZppFwMtT59TAhN+SMbNIh3uWDPJZPdNTFlnyRnz3kGDW1sCTfpBUslBpqK+dIWoEsqY0if2ZimOr8lmGQ2m94XpJTuZo1+3Im17Jml1G5LBflGB2C0ealupA3dHggYPFW9pLakAV5La1a/JCHclhGExtwXN5Lq65o2/MMxsKtns6afWnVEXCgl6uOgAORAnpJAb2EAefkttyXBx335Lpk1q8NZmtmbWZva7JEZn1m/5DYiXpHWjWmjOCuZOR++i4zuieSr0ClELCVNfvCirn4wf91CFjJsimWf/UW/0lSQC8poJcU0EsK6CUF9ELAx6xZirC2svPa0lwsFryT4XowdvuNa3Atq7Yo2boranZFrSK8ksUVNWzKZ2mdgxyzNjDnJde0zkGykKkZrqJnJbtNkzLvf5WX8lwyEhb5FjDbGflmT5kt4BG5Iq3dLf7vlo6Ej0bjC7pAwlb6HN1dAAAAAElFTkSuQmCC",
            "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACgAAAAoCAYAAACM/rhtAAAAAXNSR0IArs4c6QAAAetJREFUWEftmD1PVEEUhp8XMYRCCuxsoPKDgtKCHo2ECiyg1kSj8aOXkh9gJJqYaG0jVASCP8DCkkKUSgstLbQwBvQ1o7Ob62avO9xL7m4xU+6eu+fZd+acOfcVA7404HzUBrQ9DswDk8BQ/MM/gY/ApqQvdUSoBWh7GXgKnCqB+AbckPSiKmRlQNsXgdfAiR7Jg5ozkt5UgawD+Ay4lpj0uaTribH/hNUB3AKuJCbdljSXGDsYgLZPApeAaWAkUhkIRfVK0vvwWV8UtD0FbADnSlQNoI+B+40D2h4F9oCJhC1f6QfgIvAyAS6EfO4H4B3gUSJg82fQdgb8szu2K/XBrGDrcDeuoO3QNGeB04UG/gPYjZ39oFh5jQHaDtPIQ+D2f26WcO0sSHrbuIK2HwCrCX3pAzAl6XujRWL7E3AmATCEXJW03jRguJhT111JaxmwIJdsZwWB9kR95JskK/j3PGUFW3WV20xnQ85tJiqSi6SvRVJ1mqlkHtk+2ntxjXmwkv0WnYUw+AbDs9daCVXcmqhvFRzSzgffAYvFiTqOXEvRwBwryfQVuNlpYNq+EL2Z8yXP/QKeAPfazoLts9Ft6vZOsiPpsNuPFSzg4LW0zMyeFrDtYeByibsV8u2HfJWtj157c1zfDzzgb6FmtY8fH5R7AAAAAElFTkSuQmCC",
            "Chart View"
        )
        this.menuContainer3 = appendMenuItem(
            target,
            "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACgAAAAoCAYAAACM/rhtAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAKgSURBVFhHzdjJ7s1QAMfxa0ywQSIiQRC8AkuxwA474wuIYOEJjJGIaUH8kWAhEh7Bgg1WiESwsTdPiXn6/tL2pu39tfe0t277Sz5p03tOe+5pe3ra3ohZiGt4gvf4FfuAp7iORWgtN/B3iJtoJZPwGq5RaSqjsmPPcrgGOStQK5PjZZ2sjpchqVI2k3E1cFW8bCRq9HqswTRtyGUODuIj3Ol0VPYw5iKf6ViLDQjqsAkkO36Ly9iImdiGkBujyBvswCxsxlVoeEp+v4DSqHJ6h2nfzLa6vpttiZ2wmY93cJXGSW1QWwZyHq5CG3SZZbIUP+EKt+EHlqB/1+zC1Gi1E9HosTtajfIY7p9UoTv+bkzrrkwVj9DPabhCIR5A42Z6DEvGUv3m6oQ4gX50ei/BFSyj6ZQG2qLoN5VxdctoPJyCTDTjOApXwVHvlDUuicpU6Uk9cUqzD7/hKqfpFIZGZd0+0nTMPQjKsMeZboKg52Ycna5hD4GXGEjRQTQhKMtz/IlWg6LeeRatFsYes0ovdCqdOcUuulCbvkk013P7SNMlsxeF0TCjW9xVdh4idJhRWbcP5wgGXrI0UF+Eq1Dmfw3UaktmoD4FVzBE8qhL71Dr2lal5/JOop8mJgu6CZLJQhMT38xk4ThcoTYdQz9dm7DqnWUxMkm/zbXtHAbSlZcmvZrOg03Za+dXs62uL2ZbYitKo8liUliPtCvYhBnYjlFe3F9hC7QvfQzQRwH1WPK7PbX56BmrR5M+R7gXKc06DqHKpw990DyA2chHx9BnlnVo9DPdWbjGOGdQK6NMt+7Hy5BUKdtYVsL1lrMMY4+ul/QFXiR4nucyyinWwe9Eq6W5HS9rJTOlqZF7WAD1pu5G0cTzE17gFvbjM2qk1/sHLdIPCVOWwxEAAAAASUVORK5CYII=",
            "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACgAAAAoCAYAAACM/rhtAAAAAXNSR0IArs4c6QAAA7BJREFUWEfdmVuIVWUUx39/k9KHxCwLxR7CWz5I45MpPqrNg4FFIJT4oF0U7eJopfkqo2jjLRVr9EEDQ0VEFOz2FHR7UnuxEkKUlDStRPBWLVnD/g77nDn77O/sPcMc/F5mOGet//qftb/1/9b6tiixzGwMsAF4BhgNPJzA3QAuAaeBdyVdKBpGRR3dz8wOAS/lYByWlGeTCVGYoJm572XgsRyCfwKPS7IiyShDcBxwNjLoBEmxtlWQZQjOBz6NJLhAUqxtnxHcDiyNJLhD0rJI28YEzWwQMAu4DXwr6W7aw8weATqAt4BhkUGvA/6DuiRdq8F7EJgB+N8vJf2f/r7XIzazT4DXEiMHOwYcAb4C5gJbIwoji/dV4J0EbzbwAvA8MDxx2C0pxO75qIqgmTXaV57RhyIzlmd2J8lYPbuq/VohaGZPAGcAf4QDuf4CJkn6oyqDZvYx8PpAMkvF7pbUw6Ung2b2FPArMLhFCHphunaeCwQ3AitbhFyg4RW/MhD8CZhckqBX/C8JxkRgREm805LaAkGXDte1IusksNplKGhYSkvXAVOKgAKbJXUEgr73vEgWNgl2AHBZcNnotczMxXcfMK9J3N3AYkn/pWXG/+8EVkWCeeaezSIXMBKSPzSRyU5Ja4J/vZPElb4L8COv0WqX9EXMjzGz54DPc2z9iFsuaVvarm43Y2ZXco4zL4iRtedmFgEzewBwzEaHwGVJflhUrSyC/wIOmrW+lzQ9JnupR/0dMK2Bz11JvmfvD4Kt+4jNzPVwcx8XSTtwImdL+MziReKaXFm1MrMW+CByb50CpkbKzI9AWySui/uaMGSlhXoXsCgSJJj1l1DvAd6oCLWZbQHebpJcMA9H3dcO6B8msjITWN9E5mrDb5G0vC+bBW80f06iPN0HjW9Vs/AhsKJgBvvLbYOk91u1YfXmY7yk8+kqTk9z/ZWVWNxdkpa4cSsOTT6a+tDkh0VTY+ctYEhsCnLsbgJDM2xelvRZ+K5eu9UNvJoYeNdyPBm0vbV6EXBJyrvRyuLnWfGT6igQBvc5wKOJQ+XRNiLofaA7+0b9RpJ3NpWVXH14xb/ZxNXHP4D3eZsk/V2D5918uPrwsaHqmq7M7dZOoGcjR6yPJBWaecoQXADsjSDnJq9I2h9pW2VWhuCE1JiZF3uspN/yjOp9X4ag+/qmDxs8K37dVj6WbGGCHsDMDieV3SjeQUnNjp0VvLIEn0xeQ/itxKia1xAXk9cQ70n6PTZjtXb3AFrJTjgE+2NJAAAAAElFTkSuQmCC",
            "Settings"
        )

        this.cardLeft = document.createElement("div");
        this.cardLeft.className = "cardLeft";

        let cardLeftTitle = document.createElement("div");
        cardLeftTitle.className = "cardLeftTitle";
        cardLeftTitle.innerHTML = "Filters";

        this.filterYear1 = document.createElement("div");
        this.filterYear1.className = "filterYear";
        this.filterYear1.style.left = "20px";
        appendFilterItem(this.filterYear1, "Year 1");

        this.filterYear2 = document.createElement("div");
        this.filterYear2.className = "filterYear";
        this.filterYear2.style.left = "120px";
        appendFilterItem(this.filterYear2, "Year 2");

        let filterRegion = document.createElement("div");
        filterRegion.className = "filterRegion";

        let filterRegionTitle = document.createElement("div");
        filterRegionTitle.className = "filterRegionTitle";
        filterRegionTitle.innerHTML = "Region";
        filterRegion.appendChild(filterRegionTitle);

        let regionNames = [
            "Asia and the Pacific",
            "East Horn and Great Lakes",
            "Europe",
            "Middle East and North Africa",
            "Southern Africa",
            "The Americas",
            "West and Central Africa"
        ];
        for (let i = 0; i < regionNames.length; i++) {
            let filterRegionItem = document.createElement("div");
            let filterRegionItemInput = document.createElement("input");
            let filterRegionItemLabel = document.createElement("label");

            filterRegionItem.className = "filterRegionItem";
            filterRegionItem.style.top = `${40 + (30 * i)}px`;

            filterRegionItemInput.className = "filterRegionInput";
            filterRegionItemInput.type = "checkbox";
            filterRegionItemInput.id = regionNames[i];
            filterRegionItemInput.name = "region";
            filterRegionItemInput.value = regionNames[i];

            filterRegionItemLabel.className = "filterRegionLabel";
            filterRegionItemLabel.htmlFor = regionNames[i];
            filterRegionItemLabel.innerHTML = regionNames[i];

            filterRegionItem.appendChild(filterRegionItemInput);
            filterRegionItem.appendChild(filterRegionItemLabel);
            filterRegion.appendChild(filterRegionItem);
        }

        this.cardLeft.appendChild(cardLeftTitle);
        this.cardLeft.appendChild(this.filterYear1);
        this.cardLeft.appendChild(this.filterYear2);
        this.cardLeft.appendChild(filterRegion);
        target.appendChild(this.cardLeft);

        this.chartViewCardRight = document.createElement("div");
        this.chartViewCardRight.className = "cardRight";
        target.appendChild(this.chartViewCardRight);

        this.chartViewIconArea = document.createElement("div");
        this.chartViewIconArea.className = "chartViewIconArea";
        let chartViewIcon = document.createElement("img");
        chartViewIcon.className = "chartViewIcon";
        chartViewIcon.src = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACgAAAAoCAYAAACM/rhtAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAALISURBVFhHzZk9axVBFIav35aJYKMQtdE26UwhiCgSCwsjCArWGkgbW9H8BC20EhW0UUtT2Ocn2Cm2+ahVUPR9dnfCcDy7d3dmYu4LDzuZPXtmZnfOmXPJqKAeiO0G2hOlK+KP4bLI1v7mmqvzzTXWfHPNUqkJHmiusby+wSo1wV1TziqPimtiWdwU0yLWKXFWHBLfxC/xX8REVsWWsIHRBrY8YxdRXHfEpvAm0QeexUdx8ZmeC2/QFPCFzyLC0QfhDZQDPg+KbHW9ue/ipbghZgSLAdr0cQ8b71l4JrLEfvEcwxtxUozTCYGt5wNuiyQRcV5AkC7ui6HiGZ61/hgjKbpJC9YZ3BOejgmON6DtiUl6PhlrkEjCXp7jU1nNiTXxWwQ72vRxz+qtiH0CYx0RvXVdWCdsdrvnbomfwtoGuIdNLHz8ENaWMXvrqbAOiMhYvJ2uyQWwsW8SX9buifhH4SymniNiL4mLwjtbH4nPdbPSC3GubnaKMU6L19VftfYJ+2aPC8Zk/AvisPgiqurXrsaD3BZEEMR7bhxEb7xgfHl2lqoyp0T3blrio4lI9Wy6iAtYfHk2lu2JrwfRivBmb9mLT7zCZkX8wOEThKC5K87UzR0tivd1sxJ57mrdHCtsF+pmJc7pd3VzR19FyBQsfl18qv5yRMjb1dg0Myv6phlsY70S1s5NM22a+ESdctTFhQDtj8K+OeQddRQMg4461FYstFUyBEEoFmySD1oSns/HYrAYpGS5xeS8yN8QUyJJFJPWYYBP1adgxcb7rIHkgjWoq+RnsxORbSU/97yACGSX/IgBd+NHEzm1yI8mhCNW6w2UAr6KTS4W+8ULnL7wbPaeGycijrQwZKLYkraSozVFJFayP0cUhaWdFH3cw2ZwEi6th8JOkL5sTXw9WGqCnBBWXt9glZogtZuV17eniv8NQZVeQKPRX5QX+tBC7UU/AAAAAElFTkSuQmCC";
        this.chartViewIconArea.appendChild(chartViewIcon);
        this.chartViewCardRight.appendChild(this.chartViewIconArea);

        this.chartViewSelectRegion = appendDropdown(this.chartViewCardRight, 55, "chartViewSelectRegion");
        this.chartViewSelectOperation = appendDropdown(this.chartViewCardRight, 235, "chartViewSelectOperation");
        this.chartViewSelectX = appendDropdown(this.chartViewCardRight, 415, "chartViewSelectX");
        this.chartViewSelectY = appendDropdown(this.chartViewCardRight, 595, "chartViewSelectY");

        this.chartViewSvg = d3.select(this.chartViewCardRight)
            .append("svg")
            .classed("chartViewSvg", true);
        this.grid = this.chartViewSvg
            .append("g")
            .classed("grid", true);
        this.regressionArea = this.chartViewSvg
            .append("g")
            .classed("regressionArea", true)
            .append("path");
        this.regressionLine = this.chartViewSvg
            .append("g")
            .classed("regressionLine", true);
        this.xAxis = this.chartViewSvg
            .append("g")
            .classed("xAxis", true);
        this.yAxis = this.chartViewSvg
            .append("g")
            .classed("yAxis", true);
        this.chartArea = this.chartViewSvg
            .append("g")
            .classed("chartArea", true);
        this.chart = this.chartArea
            .append("g")
            .classed("chart", true);
        this.label = this.chartArea
            .append("g")
            .classed("label", true);
        this.chartOutlier = this.chartViewSvg
            .append("g")
            .classed("chartOutlier", true);
        this.chartGlobalAverage = this.chartViewSvg
            .append("g")
            .classed("chartGlobalAverage", true);
        this.labelGlobalAverage = this.chartViewSvg
            .append("g")
            .classed("labelGlobalAverage", true);
        this.chartRegionalAverages = this.chartViewSvg
            .append("g")
            .classed("chartRegionalAverages", true);
        this.labelRegionalAverages = this.chartViewSvg
            .append("g")
            .classed("labelRegionalAverages", true);
        this.chartHighlightRegion = this.chartViewSvg
            .append("g")
            .classed("chartHighlightRegion", true);
        this.labelHighlightRegion = this.chartViewSvg
            .append("g")
            .classed("labelHighlightRegion", true);
        this.chartHighlightOperation = this.chartViewSvg
            .append("g")
            .classed("chartHighlightOperation", true);
        this.labelHighlightOperation = this.chartViewSvg
            .append("g")
            .classed("labelHighlightOperation", true);
        this.tooltip = d3.select(this.chartViewCardRight)
            .append("div")
            .classed("tooltip", true);

        this.settingsGridView = document.createElement("div");
        this.settingsGridView.className = "settings";
        this.settingsGridView.style.left = "225px";
        target.appendChild(this.settingsGridView);

        let settingsGridViewTitle = document.createElement("div");
        settingsGridViewTitle.className = "settingsTitle";
        settingsGridViewTitle.innerHTML = "Grid View";
        this.settingsGridView.appendChild(settingsGridViewTitle);

        let settingsGridViewList1 = document.createElement("div");
        settingsGridViewList1.className = "settingsList1";
        this.settingsGridView.appendChild(settingsGridViewList1);

        let settingsGridViewList1Title = document.createElement("div");
        settingsGridViewList1Title.className = "settingsListTitle";
        settingsGridViewList1Title.innerHTML = "Show/Hide features";
        settingsGridViewList1.appendChild(settingsGridViewList1Title);

        this.settingsChartView = document.createElement("div");
        this.settingsChartView.className = "settings";
        this.settingsChartView.style.left = "545px";
        target.appendChild(this.settingsChartView);

        let settingsChartViewTitle = document.createElement("div");
        settingsChartViewTitle.className = "settingsTitle";
        settingsChartViewTitle.innerHTML = "Chart View";
        this.settingsChartView.appendChild(settingsChartViewTitle);

        let settingsChartViewList1 = document.createElement("div");
        settingsChartViewList1.className = "settingsList1";
        this.settingsChartView.appendChild(settingsChartViewList1);

        let settingsChartViewList1Title = document.createElement("div");
        settingsChartViewList1Title.className = "settingsListTitle";
        settingsChartViewList1Title.innerHTML = "Show/Hide features";
        settingsChartViewList1.appendChild(settingsChartViewList1Title);

        this.CheckboxLinearRegression = appendCheckbox(settingsChartViewList1, 45, "linearRegression", "Linear regression");
        this.CheckboxGlobalAverage = appendCheckbox(settingsChartViewList1, 80, "globalAverage", "Global average");
        this.CheckboxRegionalAverages = appendCheckbox(settingsChartViewList1, 115, "regionalAverages", "Regional averages");

        this.selectMenuItem(1);

    }

    public update(options: VisualUpdateOptions) {

        function readData(options: VisualUpdateOptions): ColumnTable {

            let dataViews = options.dataViews;
            let columnNames: string[] = [];
            let columns: { [index: string]: (string | number)[] } = {};

            for (let i = 0; i < dataViews[0].table.columns.length; i++) {
                if (dataViews[0].table.columns[i].displayName.substring(0, 3) == "Sum") {
                    columnNames.push(dataViews[0].table.columns[i].displayName.substring(7));
                    columns[columnNames[i]] = [];
                } else {
                    columnNames.push(dataViews[0].table.columns[i].displayName);
                    columns[columnNames[i]] = [];
                }
            }

            for (let i = 0; i < dataViews[0].table.rows.length; i++) {
                let row = dataViews[0].table.rows[i];
                for (let i = 0; i < columnNames.length; i++) {
                    let rowItem = row[i];
                    if (typeof rowItem === "number" || typeof rowItem === "string") {
                        columns[columnNames[i]].push(rowItem);
                    } else if (columnNames[i].substring(0, 5) == "Ratio") {
                        columns[columnNames[i]].push(null);
                    } else {
                        columns[columnNames[i]].push(0);
                    }
                }
            }

            return aq.table(columns);

        }

        function updateDropdownOptions(dt: ColumnTable, element: HTMLSelectElement) {

            function convertToOptions(array: string[]) {
                for (let i = 0; i < array.length; i++) {
                    let option = document.createElement("option");
                    option.value = array[i];
                    option.text = option.value;
                    element.add(option);
                    if (option.value == optionValue) {
                        element.value = option.value;
                    }
                }
            }

            let optionValue = element.value;

            while (element.firstChild) {
                element.removeChild(element.firstChild);
            }

            switch (element.id) {

                case "chartViewSelectRegion": {

                    let option = document.createElement("option");
                    option.value = "";
                    option.text = "- Region to highlight";
                    element.add(option);

                    let regions: string[] = dt
                        .select("Region")
                        .dedupe()
                        .orderby("Region")
                        .array("Region");

                    convertToOptions(regions);

                    break;

                }

                case "chartViewSelectOperation": {

                    let option = document.createElement("option");
                    option.value = "";
                    option.text = "- Operation to highlight";
                    element.add(option);

                    let operations: string[] = dt
                        .select("Operation")
                        .dedupe()
                        .orderby("Operation")
                        .array("Operation");

                    convertToOptions(operations);

                    break;

                }

                case "chartViewSelectX": {

                    let option = document.createElement("option");
                    option.value = "";
                    option.text = "- Measure for X axis";
                    element.add(option);

                    let displayNames = dt
                        .columnNames(d => !["Fiscal Year", "Region", "Operation", "Filter Year 1", "Filter Year 2"].includes(d));
                    displayNames.sort(d3.ascending);

                    convertToOptions(displayNames);

                    break;

                }

                case "chartViewSelectY": {

                    let option = document.createElement("option");
                    option.value = "";
                    option.text = "- Measure for Y axis";
                    element.add(option);

                    let displayNames = dt
                        .columnNames(d => !["Fiscal Year", "Region", "Operation", "Filter Year 1", "Filter Year 2"].includes(d));
                    displayNames.sort(d3.ascending);

                    convertToOptions(displayNames);

                    break;

                }

            }

        }

        function transformData(dt: ColumnTable, xValue: string, yValue: string): dataModel {

            function getRegionFilters(): string[] {

                let regionFilters: string[] = [];

                let filterItems = document.getElementsByName("region") as NodeListOf<HTMLInputElement>;
                for (let i = 0; i < filterItems.length; i++) {
                    if (filterItems[i].checked == true) {
                        regionFilters.push(filterItems[i].value);
                    }
                }

                return regionFilters;
            }

            function getYearFilters(): number[] {

                let yearFilters: number[] = [];

                let items1 = document.getElementsByName("year1") as NodeListOf<HTMLInputElement>;
                for (let i = 0; i < items1.length; i++) {
                    if (items1[i].checked == true) {
                        yearFilters.push(parseInt(items1[i].value, 10));
                    }
                }

                let items2 = document.getElementsByName("year2") as NodeListOf<HTMLInputElement>;
                for (let i = 0; i < items2.length; i++) {
                    if (items2[i].checked == true) {
                        yearFilters.push(parseInt(items2[i].value, 10));
                    }
                }

                return yearFilters;
            }

            function getOperationData(dt: ColumnTable): ColumnTable {

                let linReg = linearRegressionLine(linearRegression(dt.array("regression")));

                dt = dt
                    .derive({ yhat: aq.escape(d => linReg(d.x)) })
                    .derive({ resid: d => d.y - d.yhat })
                    .derive({
                        lower: d => d.yhat - aq.op.stdevp(d.resid),
                        upper: d => d.yhat + aq.op.stdevp(d.resid)
                    })
                    .derive({
                        lower2: d => d.yhat - (2 * aq.op.stdevp(d.resid)),
                        upper2: d => d.yhat + (2 * aq.op.stdevp(d.resid))
                    })
                    .select("Region", "Operation", "x", "y", "yhat", "lower", "upper", "lower2", "upper2")
                    .orderby("x")
                    .reify();

                return dt;

            }

            function getRegionalAverages(dt: ColumnTable, xValue: string, yValue: string): ColumnTable {

                let xMeasures: string[];
                let yMeasures: string[];
                let xRegions: ColumnTable;
                let yRegions: ColumnTable;

                if (xValue.substring(0, 5) == "Ratio") {

                    xMeasures = xValue.substring(6).split("_vs_");
                    xRegions = dt
                        .derive({ xNumerator: aq.escape(d => d[xMeasures[0]]), xDenominator: aq.escape(d => d[xMeasures[1]]) })
                        .select("Region", "xNumerator", "xDenominator")
                        .groupby("Region")
                        .rollup({ x: d => aq.op.sum(d.xNumerator) / aq.op.sum(d.xDenominator) })
                        .reify();

                } else {

                    xRegions = dt
                        .derive({ x: aq.escape(d => d[xValue]) })
                        .select("Region", "x")
                        .groupby("Region")
                        .rollup({ x: aq.op.mean("x") })
                        .reify();

                }

                if (yValue.substring(0, 5) == "Ratio") {

                    yMeasures = yValue.substring(6).split("_vs_");
                    yRegions = dt
                        .derive({ yNumerator: aq.escape(d => d[yMeasures[0]]), yDenominator: aq.escape(d => d[yMeasures[1]]) })
                        .select("Region", "yNumerator", "yDenominator")
                        .groupby("Region")
                        .rollup({ y: d => aq.op.sum(d.yNumerator) / aq.op.sum(d.yDenominator) })
                        .reify();

                } else {

                    yRegions = dt
                        .derive({ y: aq.escape(d => d[yValue]) })
                        .select("Region", "y")
                        .groupby("Region")
                        .rollup({ y: aq.op.mean("y") })
                        .reify();

                }

                return xRegions.join(yRegions);

            }

            function getGlobalAverage(dt: ColumnTable, xValue: string, yValue: string): ColumnTable {

                let xMeasures: string[];
                let yMeasures: string[];
                let xGlobal: ColumnTable;
                let yGlobal: ColumnTable;

                if (xValue.substring(0, 5) == "Ratio") {

                    xMeasures = xValue.substring(6).split("_vs_");
                    xGlobal = dt
                        .derive({ xNumerator: aq.escape(d => d[xMeasures[0]]), xDenominator: aq.escape(d => d[xMeasures[1]]) })
                        .select("xNumerator", "xDenominator")
                        .rollup({ x: d => aq.op.sum(d.xNumerator) / aq.op.sum(d.xDenominator) })
                        .derive({ Region: () => "Global" })
                        .reify();

                } else {

                    xGlobal = dt
                        .derive({ x: aq.escape(d => d[xValue]) })
                        .select("x")
                        .rollup({ x: aq.op.mean("x") })
                        .derive({ Region: () => "Global" })
                        .reify();

                }

                if (yValue.substring(0, 5) == "Ratio") {

                    yMeasures = yValue.substring(6).split("_vs_");
                    yGlobal = dt
                        .derive({ yNumerator: aq.escape(d => d[yMeasures[0]]), yDenominator: aq.escape(d => d[yMeasures[1]]) })
                        .select("yNumerator", "yDenominator")
                        .rollup({ y: d => aq.op.sum(d.yNumerator) / aq.op.sum(d.yDenominator) })
                        .derive({ Region: () => "Global" })
                        .reify();

                } else {

                    yGlobal = dt
                        .derive({ y: aq.escape(d => d[yValue]) })
                        .select("y")
                        .rollup({ y: aq.op.mean("y") })
                        .derive({ Region: () => "Global" })
                        .reify();

                }

                return xGlobal.join(yGlobal);

            }


            let regionFilters = getRegionFilters();
            let yearFilters = getYearFilters();
            let operations: ColumnTable;
            let regions: ColumnTable;
            let global: ColumnTable;

            if (yearFilters[0] == yearFilters[1]) {

                let dtFiltered: ColumnTable = dt
                    .filter(aq.escape(d => d["Fiscal Year"] == yearFilters[0]));

                operations = dtFiltered
                    .derive({ x: aq.escape(d => d[xValue]), y: aq.escape(d => d[yValue]) })
                    .select("Region", "Operation", "x", "y")
                    .filter(d => d.x != null && d.y != null)
                    .derive({ regression: d => [d.x, d.y] })
                    .reify();
                operations = getOperationData(operations);

                regions = getRegionalAverages(dtFiltered, xValue, yValue);
                global = getGlobalAverage(dtFiltered, xValue, yValue);

            } else {

                operations = dt
                    .filter(aq.escape(d => d["Fiscal Year"] == yearFilters[0] || d["Fiscal Year"] == yearFilters[1]))
                    .derive({ x: aq.escape(d => d[xValue]), y: aq.escape(d => d[yValue]) })
                    .select("Fiscal Year", "Region", "Operation", "x", "y")
                    .groupby("Region", "Operation")
                    .pivot("Fiscal Year", ["x", "y"])
                    .rename(aq.names("Region", "Operation", "xOld", "xNew", "yOld", "yNew") as Select)
                    .filter(d => d.xOld != null && d.xNew != null && d.yOld != null && d.yNew != null)
                    .derive({
                        x: d => d.xNew - d.xOld,
                        y: d => d.yNew - d.yOld
                    })
                    .derive({ regression: d => [d.x, d.y] });
                operations = getOperationData(operations);

                let dtFilteredOld: ColumnTable;
                let dtFilteredNew: ColumnTable;

                if (yearFilters[0] < yearFilters[1]) {
                    dtFilteredOld = dt.filter(aq.escape(d => d["Fiscal Year"] == yearFilters[0]));
                    dtFilteredNew = dt.filter(aq.escape(d => d["Fiscal Year"] == yearFilters[1]));
                } else {
                    dtFilteredOld = dt.filter(aq.escape(d => d["Fiscal Year"] == yearFilters[1]));
                    dtFilteredNew = dt.filter(aq.escape(d => d["Fiscal Year"] == yearFilters[0]));
                }

                let regionsOld = getRegionalAverages(dtFilteredOld, xValue, yValue)
                    .rename({ x: "xOld", y: "yOld" });
                let regionsNew = getRegionalAverages(dtFilteredNew, xValue, yValue)
                    .rename({ x: "xNew", y: "yNew" });
                regions = regionsOld
                    .join(regionsNew)
                    .derive({ x: d => d.xNew - d.xOld, y: d => d.yNew - d.yOld })
                    .select("Region", "x", "y")
                    .reify();

                let globalOld = getGlobalAverage(dtFilteredOld, xValue, yValue)
                    .rename({ x: "xOld", y: "yOld" });
                let globalNew = getGlobalAverage(dtFilteredNew, xValue, yValue)
                    .rename({ x: "xNew", y: "yNew" });
                global = globalOld
                    .join(globalNew)
                    .derive({ x: d => d.xNew - d.xOld, y: d => d.yNew - d.yOld })
                    .select("Region", "x", "y")
                    .reify();

            }

            if (regionFilters.length > 0) {
                operations = operations
                    .filter(aq.escape(d => regionFilters.includes(d.Region)));
            }

            return {
                "operations": operations,
                "regions": regions,
                "global": global
            };

        }

        let dt = readData(options);

        updateDropdownOptions(dt, this.chartViewSelectRegion);
        updateDropdownOptions(dt, this.chartViewSelectOperation);
        updateDropdownOptions(dt, this.chartViewSelectX);
        updateDropdownOptions(dt, this.chartViewSelectY);

        this.chartViewSelectRegion.onchange = () => {
            let dataModel = transformData(dt, this.chartViewSelectX.value, this.chartViewSelectY.value);
            this.drawChart(dataModel);
        }

        this.chartViewSelectOperation.onchange = () => {
            let dataModel = transformData(dt, this.chartViewSelectX.value, this.chartViewSelectY.value);
            this.drawChart(dataModel);
        }

        this.chartViewSelectX.onchange = () => {
            let dataModel = transformData(dt, this.chartViewSelectX.value, this.chartViewSelectY.value);
            updateDropdownOptions(dataModel.operations, this.chartViewSelectRegion);
            updateDropdownOptions(dataModel.operations, this.chartViewSelectOperation);
            this.drawChart(dataModel);
        }

        this.chartViewSelectY.onchange = () => {
            let dataModel = transformData(dt, this.chartViewSelectX.value, this.chartViewSelectY.value);
            updateDropdownOptions(dataModel.operations, this.chartViewSelectRegion);
            updateDropdownOptions(dataModel.operations, this.chartViewSelectOperation);
            this.drawChart(dataModel);
        }

        this.menuContainer1.onclick = () => {

            if (this.menuContainer1.style.background == "none") {
                this.selectMenuItem(1);
            }

        }

        this.menuContainer2.onclick = () => {

            if (this.menuContainer2.style.background == "none") {
                this.selectMenuItem(2);
            }

        }

        this.menuContainer3.onclick = () => {

            if (this.menuContainer3.style.background == "none") {
                this.selectMenuItem(3);
            }

        }

        let filterChoices = this.cardLeft.getElementsByTagName("input");
        for (let i = 0; i < filterChoices.length; i++) {
            filterChoices[i].onchange = () => {
                let dataModel = transformData(dt, this.chartViewSelectX.value, this.chartViewSelectY.value);
                updateDropdownOptions(dataModel.operations, this.chartViewSelectRegion);
                updateDropdownOptions(dataModel.operations, this.chartViewSelectOperation);
                this.drawChart(dataModel);
            }
        }

        let dataModel = transformData(dt, this.chartViewSelectX.value, this.chartViewSelectY.value);
        updateDropdownOptions(dataModel.operations, this.chartViewSelectRegion);
        updateDropdownOptions(dataModel.operations, this.chartViewSelectOperation);
        this.drawChart(dataModel);

    }

}