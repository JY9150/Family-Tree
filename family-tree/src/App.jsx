import { useState, useEffect, useRef } from "react";
import * as d3 from "d3";
import "./App.css";
import json_data from "./assets/family_member.json";
import PropTypes from "prop-types";
import { width } from "@mui/system";

function TreeChart({ data, svgRef }) {
  const gRef = useRef();

  useEffect(() => {
    if (!svgRef.current || !gRef.current) {
      return;
    }
    const svg = d3.select(svgRef.current);
    const group = d3.select(gRef.current);

    group.selectAll("*").remove();


    const svg_width =
      svg.node().clientWidth || svg.node().getBoundingClientRect().width;
    const svg_height =
      svg.node().clientHeight || svg.node().getBoundingClientRect().height;

    group.attr("transfrom", `translate(${svg_width / 2}, ${svg_height / 2})`);

    function dragstarted(event) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
    }
    
    function dragged(event) {
      event.subject.fx = event.x;
      event.subject.fy = event.y;
    }
    
    function dragended(event) {
      if (!event.active) simulation.alphaTarget(0);
      event.subject.fx = null;
      event.subject.fy = null;
    }

    const validData = paraseData(data);
    checkDataValid(validData);

    const links = createLinks(validData);
    const nodes = createNodesFromLink(links, data);

    console.log("links", links);
    console.log("nodes", nodes);

    const genderColorScale = d3
      .scaleOrdinal()
      .domain(["male", "female", "non-binary", "unknown"])
      .range(["blue", "red", "grey", "black"]);

    const simulation = d3
      .forceSimulation(nodes)
      .force(
        "link",
        d3
          .forceLink(links)
          .id((d) => d.id)
          .distance((link) => {
            if (link.target.name === "fake") {
              return 50;
            } else {
              return 100;
            }
          })
      )
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(svg_width / 2, svg_height / 2));

    // Draw links
    const link = group
      .append("g")
      .selectAll(".link")
      .data(links)
      .enter()
      .append("line")
      .attr("class", "link")
      .attr("stroke", (d) => (d.target.name === "fake" ? "yellow" : "black"))
      .attr("stroke-width", 4);

    const nodeGroup = group
      .append("g")
      .selectAll(".node")
      .data(nodes)
      .enter()
      .append("g")
      .attr("class", "node")
      .attr("display", (d) => (d.name === "fake" ? "none" : "block"))
      .call(
        d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended)
      );

    nodeGroup
      .append("circle")
      .attr("r", 10)
      .attr("fill", (d) => genderColorScale(d.gender));

    nodeGroup
      .append("text")
      .attr("dy", -15)
      .attr("text-anchor", "middle")
      .text((d) => d.name);

    simulation.on("tick", () => {
      link
        .attr("x1", (d) => d.source.x)
        .attr("y1", (d) => d.source.y)
        .attr("x2", (d) => d.target.x)
        .attr("y2", (d) => d.target.y);

      nodes.forEach((d) => {
        if (d.name === "fake") {
          // !! All Fake node are in the Target
          const left_node = links.find(
            (link) => link.target.id === d.id
          ).source;
          const right_node = links.find(
            (link) => link.target.id === d.id && link.source.id !== left_node.id
          ).source;

          const new_cx = (left_node.x + right_node.x) / 2;
          const new_cy = (left_node.y + right_node.y) / 2;

          d.x = new_cx;
          d.y = new_cy;
        }
      });

      nodeGroup.attr("transform", (d) => `translate(${d.x}, ${d.y})`);
    });

    group
      .append("text")
      .attr("cx", svg_width / 2)
      .attr("cy", svg_height / 2)
      .attr("text-anchor", "middle")
      .attr("font-size", 50)
      .text("+");

    const drag = d3
    .drag()
    .on("start", (event) => {
      console.log("start");
      const { x, y } = d3.zoomTransform(group.node());
      event.subject = { startX: event.x - x, startY: event.y - y };
    })
    .on("drag", (event) => {
      const x = event.x - event.subject.startX;
      const y = event.y - event.subject.startY;
      svg.attr("transform", `translate(${x}, ${y}) scale(${d3.zoomTransform(group.node()).k})`);
    });

    const zoom = d3.zoom().on("zoom", (event) => {
      group.attr("transform", event.transform);
    });

    svg.call(zoom);
    svg.call(drag);
  }, [data, svgRef, gRef]);

  return <g ref={gRef} className="treeChart" id="treeChart" />;
}

TreeChart.propTypes = {
  data: PropTypes.array.isRequired,
  svgRef: PropTypes.object.isRequired,
};

Canvas.propTypes = {
  data: PropTypes.array.isRequired,
};

function App() {
  // const [data, setData] = useState([]);
  // setData(json_data);

  return (
    <>
      <Canvas data={json_data} />
    </>
  );
}

function Canvas({ data }) {
  const svgRef = useRef();
  const [currentTransform, setCurrentTransform] = useState(d3.zoomIdentity);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
  }, [svgRef, currentTransform]);

  return (
    <>
      <svg ref={svgRef} className="canvas" id="canvas">
        <TreeChart data={data} svgRef={svgRef} />
      </svg>
    </>
  );
}

function createLinks(data) {
  const links = [];
  let fakeNode_temp_id = 0;

  data.forEach((person) => {
    if (person.spouse.length > 0) {
      // Exist spouse
      const fakeNode_id = (--fakeNode_temp_id).toString();
      person.spouse.forEach((spouse_id) => {
        links.push({
          source: person.id,
          target: fakeNode_id,
          type: "marriage",
        });
        links.push({
          source: spouse_id,
          target: fakeNode_id,
          type: "marriage",
        });
      });

      if (person.children.length > 0) {
        person.children.forEach((child_id) => {
          links.push({
            source: fakeNode_id,
            target: child_id,
            type: "direct-relative",
          });
        });
      }
    }
  });
  return links;
}

function createNodesFromLink(links, data) {
  const nodes = [];
  const nodes_ids = new Set();

  links.forEach((link) => {
    nodes_ids.add(link.source);
    nodes_ids.add(link.target);
  });

  nodes_ids.forEach((id) => {
    if (id[0] === "-") {
      nodes.push({
        id: id,
        name: "fake",
      });
      return;
    } else {
      const person = data.find((person) => person.id === id);
      nodes.push({
        id: person.id,
        name: person.name,
        nickname: person.nickname,
        gender: person.gender,
        status: person.status,
      });
    }
  });
  return nodes;
}

function paraseData(data) {
  return data.map((person) => {
    return {
      id: person.id ?? "",
      name: person.name ?? "",
      nickname: person.nickname ?? "",
      status: person.status ?? "unknown",
      gender: person.gender ?? "unknown",
      spouse: person.spouse ?? [],
      children: person.children ?? [],
      image: person.image ?? "",
      birth: person.birth ?? "",
      death: person.death ?? "",
      location: person.location ?? "",
      title: person.title ?? "",
    };
  });
}

function checkDataValid(data) {
  // check if all ids are unique
  for (let i = 0; i < data.length - 1; i++) {
    if (data[i].id === data[i + 1].id) {
      console.error("Duplicate id: ", data[i].id);
      return null;
    }
  }

  // check if all spouse ids are valid
  for (let i = 0; i < data.length; i++) {
    for (let j = 0; j < data[i].spouse.length; j++) {
      if (!data.find((person) => person.id === data[i].spouse[j])) {
        console.error("Invalid spouse id: ", data[i].spouse[j]);
        return null;
      }
    }
  }
  // check if all children ids are valid
  for (let i = 0; i < data.length; i++) {
    for (let j = 0; j < data[i].children.length; j++) {
      if (!data.find((person) => person.id === data[i].children[j])) {
        console.error("Invalid children id: ", data[i].children[j]);
        return null;
      }
    }
  }
}

export default App;
