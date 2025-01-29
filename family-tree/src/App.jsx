import { useState, useEffect, useRef } from "react";
import * as d3 from "d3";
import "./App.css";
import json_data from "./assets/family_member.json";
import PropTypes from "prop-types";
import { width } from "@mui/system";

function TreeChart({ data }) {
  const gRef = useRef();
  const [currentTransform, setCurrentTransform] = useState(d3.zoomIdentity);

  useEffect(() => {
    console.log("twst");
    const validData = paraseData(data);
    checkDataValid(validData);
    const g = d3.select(gRef.current);
    g.attr("width", "200").attr("height", "200");
    // g.style("width", "100%").style("height", "100%");

    const g_width = g.node().getBoundingClientRect().width;
    const g_height = g.node().getBoundingClientRect().height;

    const links = createLinks(validData);
    const nodes = createNodesFromLink(links, data);

    console.log("links", links);
    console.log("nodes", nodes);

    // color scale
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
      .force("center", d3.forceCenter(g_width / 2, g_height / 2));

    // Draw links
    const link = g
      .append("g")
      .selectAll(".link")
      .data(links)
      .enter()
      .append("line")
      .attr("class", "link")
      .attr("stroke", (d) => (d.target.name === "fake" ? "yellow" : "black"))
      .attr("stroke-width", 4);

    const nodeGroup = g
      .append("g")
      .selectAll(".node")
      .data(nodes)
      .enter()
      .append("g")
      .attr("class", "node")
      .attr("display", (d) => (d.name === "fake" ? "none" : "block"))
      .call(
        d3.drag()
        // .on("start", dragstarted)
        // .on("drag", dragged)
        // .on("end", dragended)
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

    g.append("text")
      .attr("cx", g_width / 2)
      .attr("cy", g_height / 2)
      .attr("text-anchor", "middle")
      .attr("font-size", 50)
      .text("+");

    // Dragging the canvas
    let currentTransform = d3.zoomIdentity;
    g.call(
      d3
        .drag()
        .on("start", (event) => {
          console.log("start");

          // setCurrentTransform(d3.zoomTransform(g.node()));
          console.log("currentTransform", currentTransform);
          currentTransform.startX = event.x - currentTransform.x;
          currentTransform.startY = event.y - currentTransform.y;
          g.style("cursor", "grabbing");
        })
        .on("drag", (event) => {
          currentTransform.x = event.x - currentTransform.startX;
          currentTransform.y = event.y - currentTransform.startY;

          const transform = `translate(${currentTransform.x}, ${currentTransform.y}) scale(${currentTransform.k})`;
          g.attr("transform", transform);
        })
        .on("end", () => {
          g.style("cursor", "grab");
        })
    );

    // Zooming and save the current transformation
    g.call(
      d3.zoom().on("zoom", (event) => {
        // Apply the zoom transformation to the container group
        // const transform = `translate(${currentTransform.x}, ${currentTransform.y}) scale(${event.transform.k})`;
        g.attr("transform", event.transform);
      })
    );
  });

  return <g ref={gRef} className="treeChart" id="treeChart"/>;
}

TreeChart.propTypes = {
  data: PropTypes.array.isRequired,
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

  return (
    <>
      <svg ref={svgRef} className="canvas" id="canvas">
        <TreeChart data={data} />
      </svg>
      ;
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
