"use strict";

const data = [
  {
    id: "1",
    name: "Dad",
    nickname: "Daddy",
    status: "alive",
    gender: "male",
    spouse: ["2"],
    children: ["3", "4"],
    image: "",
    birth: "1970-01-01",
    death: "",
    location: "Toronto",
    title: "Mr.",
  },
  {
    id: "2",
    name: "Mom",
    nickname: "Mummy",
    alive: true,
  },
  {
    id: "3",
    name: "Son-1",
  },
  {
    id: "4",
    name: "Daughter-1",
  },
];

const person_template = {
  id: "1",
  name: "Dad",
  nickname: "Daddy",
  status: "alive",
  gender: "male",
  spouse: [2],
  children: [3, 4],
  image: "",
  birth: "1970-01-01",
  death: "",
  location: "Toronto",
  title: "Mr.",
};

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

  console.log(data);
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

function parseDataToTree(data) {
  // sort data by id
  data.sort((a, b) => a.id - b.id);
  // sort spouse ids
  data.forEach((person) => {
    if (person.spouse) {
      person.spouse.sort();
    }
  });
  // sort children ids
  data.forEach((person) => {
    if (person.children) {
      person.children.sort();
    }
  });

  function buildPerson(person) {
    let node;
    console.log("Person: ", person);
    if (person.spouse.length > 0) {
      person.spouse.forEach((spouse_id) => {
        console.log("Spouse: ", spouse_id);
        console.log(
          "Spouse: ",
          data.find((person) => person.id === spouse_id)
        );
      });

      node = {
        name: "Fake",
        children: [
          {
            name: person.name,
            children: [],
          },
          {
            name: "skip",
            children: person.children.map((child_id) => {
              return buildPerson(data.find((person) => person.id === child_id));
            }),
          },
          {
            name: spouse,
          },
        ].concat(
          person.spouse.map((spouse_id) => {
            return buildPerson(data.find((person) => person.id === spouse_id));
          })
        ),
      };
    } else {
      node = {
        name: person.name,
        children: [
          person.children.map((child_id) => {
            return buildPerson(data.find((person) => person.id === child_id));
          }),
        ],
      };
    }

    return node;
  }

  const person = data[0];
  const root = buildPerson(person);

  console.log(root);

  return root;
}

function createLinks(data) {
  const links = [];
  data.forEach((person) => {
    if (person.spouse.length > 0) {
      person.spouse.forEach((spouse_id) => {
        links.push({ source: person.id, target: spouse_id });
      });
    }

    if (person.children.length > 0) {
      person.children.forEach((child_id) => {
        links.push({ source: person.id, target: child_id });
      });
    }
  });
  return links;
}

function createNodes(data) {
  const in_nodes = [];
  console.log(data);
  data.forEach((person) => {
    in_nodes.push({ id: person.id, name: person.name, nickname: person.nickname });
  });
  console.log("node", in_nodes);
  return in_nodes;
}

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

const svg = d3.select("#d3-container");
const container = svg.append("g");
const svg_width = svg.style("width").slice(0, -2);
const svg_height = +svg.style("height").slice(0, -2);

const validData = paraseData(data);
checkDataValid(validData);

const links = createLinks(validData);
const nodes = createNodes(validData);

const simulation = d3
  .forceSimulation(nodes)
  .force(
    "link",
    d3
      .forceLink(links)
      .id((d) => d.id)
      .distance(100)
  )
  .force("charge", d3.forceManyBody().strength(-300))
  .force("center", d3.forceCenter(svg_width / 2, svg_height / 2));

console.log(svg_width, svg_height);

// Draw links
const link = container
  .append("g")
  .selectAll("line")
  .data(links)
  .enter()
  .append("line")
  .attr("stroke", "yellow")
  .attr("stroke-width", 4);

const nodeGroup = container
  .append("g")
  .selectAll("g")
  .data(nodes)
  .enter()
  .append("g")
  .call(
    d3.drag().on("start", dragstarted).on("drag", dragged).on("end", dragended)
  );

nodeGroup.append("circle").attr("r", 10).attr("fill", "blue");

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

  nodeGroup.attr("transform", (d) => `translate(${d.x}, ${d.y})`);
});

container
  .append("circle")
  .attr("r", 10)
  .attr("fill", "red")
  .attr("cx", svg_width / 2)
  .attr("cy", svg_height / 2);

container
  .append("circle")
  .attr("r", 10)
  .attr("fill", "green")
  .attr("cx", svg_width)
  .attr("cy", svg_height);

let currentTransform = d3.zoomIdentity;

svg.call(
  d3
    .drag()
    .on("start", (event) => {
      currentTransform = d3.zoomTransform(svg.node());
      currentTransform.startX = event.x - currentTransform.x;
      currentTransform.startY = event.y - currentTransform.y;
    })
    .on("drag", (event) => {
      // Update translation during drag
      currentTransform.x = event.x - currentTransform.startX;
      currentTransform.y = event.y - currentTransform.startY;

      // Apply translation to the container group
      const transform = `translate(${currentTransform.x}, ${currentTransform.y}) scale(${currentTransform.k})`;
      container.attr("transform", transform);
    })
);

// Zooming and save the current transformation
svg.call(
  d3.zoom().on("zoom", (event) => {
    // Apply the zoom transformation to the container group
    const transform = `translate(${currentTransform.x}, ${currentTransform.y}) scale(${event.transform.k})`;
    container.attr("transform", event.transform);
  })
);
