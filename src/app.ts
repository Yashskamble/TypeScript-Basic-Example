// Code goes here!
interface Draggable {
    dragStartHandler (event: DragEvent) : void;
    dragEndHandler (event: DragEvent) : void;
}

interface DragTarget{
    dragOverHandler(event: DragEvent) : void;
    dropHandler(event: DragEvent) : void;
    dragLeaveHandler(event: DragEvent) : void;
}

enum ProjectStatus {
    Active, 
    Finished
}

class Project {
    constructor(public id: string, public title: string, public description: string, public people: number, public status: ProjectStatus) {

    }
}

type Listners<T> = (items: T[]) => void

class State<T> {
    protected listners : Listners<T>[] = [];

    addListners(listnerFn: Listners<T>) {
        this.listners.push(listnerFn)
    }
}

class ProjectState extends State<Project> {
    // private listners : Listners[] = [];
    private projects : Project[] = [];
    private static instance: ProjectState;

    private constructor (){
        super()
    }

    static getInstance() {
        if(this.instance){
            return this.instance;
        }
        this.instance = new ProjectState();
        return this.instance;
    }

    // addListners(listnerFn: Listners) {
    //     this.listners.push(listnerFn)
    // }

    addProject(title: string, description: string, people: number){
        const newProject = new Project(Math.random().toString(), title, description, people, ProjectStatus.Active);
        this.projects.push(newProject);
        this.updateListners();
        
    }

    moveProject(projectId: string, newStatus: ProjectStatus) {
        const project = this.projects.find(prj => prj.id === projectId);
        if(project) {
            project.status = newStatus;
            this.updateListners();
        }
    }

    private updateListners() {
        for (const listnerFn of this.listners){
            listnerFn(this.projects.slice());
        }
    }
}

const projectState = ProjectState.getInstance();

//interface
interface Validatable {
    value: string | number;
    required? : boolean;
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
}

function validate(validatableInput : Validatable){
    let isValid = true;
    if(validatableInput.required) {
        isValid = isValid && validatableInput.value.toString().trim().length !== 0;
    }
    if(validatableInput.minLength != null && typeof validatableInput.value == "string"){
        isValid = isValid && validatableInput.value.length > validatableInput.minLength;
    }
    if(validatableInput.maxLength != null && typeof validatableInput.value == "string"){
        isValid = isValid && validatableInput.value.length < validatableInput.maxLength;
    }
    if(validatableInput.min != null && typeof validatableInput.value == "number"){
        isValid = isValid && validatableInput.value < validatableInput.min;
    }
    if(validatableInput.max != null && typeof validatableInput.value == "number"){
        isValid = isValid && validatableInput.value > validatableInput.max;
    }
    return  isValid;
}

//autobind decorator 
function autobind(_: any, _2: string, descriptor: PropertyDescriptor) {
    const orginalMethod = descriptor.value;
    const adjDescriptor : PropertyDescriptor = {
        configurable: true,
        get() {
            const bndFn = orginalMethod.bind(this);
            return bndFn;
        }
    };
    return adjDescriptor;
}

//component base class
abstract class Component <T extends HTMLElement, U extends HTMLElement>{
    templateElement : HTMLTemplateElement;
    hostElement : T;
    element : U;

    constructor (templateId : string, hostElementId: string, insertAtStart: boolean, newElementId?: string) {
        this.templateElement = document.getElementById(templateId)! as HTMLTemplateElement;
        this.hostElement = document.getElementById(hostElementId)! as T;

        const importNode = document.importNode(this.templateElement.content, true);
        this.element = importNode.firstElementChild as U;
        if (newElementId) {
            this.element.id = newElementId;
        }

        this.attach(insertAtStart);
    }

    private attach(valuetoInsert: boolean) {
        this.hostElement.insertAdjacentElement(valuetoInsert ? 'afterbegin' : 'beforeend', this.element);
    }

    abstract configure() : void;
    abstract renderContent(): void;
}

class ProjectItem extends Component<HTMLUListElement, HTMLLIElement> implements Draggable{
    private project: Project;

    get persons() {
        if(this.project.people === 1) {
            return '1 person'
        }
        return `${this.project.people} persons`
    }

    constructor(hostId: string, proj: Project) {
        super("single-project", hostId, false, proj.id)
        this.project = proj;

        this.configure();
        this.renderContent()
    }

    @autobind
    dragStartHandler(event: DragEvent) {
        event.dataTransfer!.setData('text/plain', this.project.id);
        event.dataTransfer!.effectAllowed = 'move';
    }

    
    dragEndHandler(_s: DragEvent){
        console.log("DragEnd")
    }

    renderContent(){
        this.element.querySelector('h2')!.textContent = this.project.title;
        this.element.querySelector('h3')!.textContent = this.persons + ' assigned';
        this.element.querySelector('p')!.textContent = this.project.description;
    }

    configure() {
        this.element.addEventListener('dragstart', this.dragStartHandler);
        this.element.addEventListener('dragend', this.dragEndHandler);
    }
}

//ProjectList class
class ProjectList extends Component<HTMLDivElement, HTMLElement> implements DragTarget{
    // templateElement : HTMLTemplateElement;
    // hostElement : HTMLDivElement;
    // element : HTMLElement;
    assignedProjects : Project[];

    constructor(private type : 'active' | 'finished') {
        super('project-list', 'app', false, `${type}-projects`)
        // this.templateElement = document.getElementById('project-list')! as HTMLTemplateElement;
        // this.hostElement = document.getElementById('app')! as HTMLDivElement;
        this.assignedProjects = []

        // const importNode = document.importNode(this.templateElement.content, true);
        // this.element = importNode.firstElementChild as HTMLElement;
        // this.element.id = `${this.type}-projects`;
        
        

        // this.attach();
        this.configure();
        this.renderContent();
    }

    @autobind
    dragLeaveHandler(_event: DragEvent): void {
        const listEl = this.element.querySelector('ul')!;
        listEl.classList.remove('droppable');
    }

    @autobind
    dropHandler(event: DragEvent): void {
        const prjId = event.dataTransfer!.getData('text/plain');
        projectState.moveProject(prjId, this.type == 'active' ? ProjectStatus.Active : ProjectStatus.Finished )
    }

    @autobind
    dragOverHandler(event: DragEvent): void {
        if(event.dataTransfer && event.dataTransfer.types[0] === 'text/plain'){
            event.preventDefault();
            const listEl = this.element.querySelector('ul')!;
            listEl.classList.add('droppable');
        }
    }

    private renderProjects() {
        const listEl = document.getElementById(`${this.type}-projects-list`)! as HTMLUListElement;
        listEl.innerHTML = '';
        for (const prjItem of this.assignedProjects){
            // const listItem = document.createElement('li');
            // listItem.textContent = prjItem.title;
            // listEl.appendChild(listItem);
            new ProjectItem(this.element.querySelector('ul')!.id, prjItem)
        }
    }

    configure() {
        this.element.addEventListener('dragover', this.dragOverHandler);
        this.element.addEventListener('dragleave', this.dragLeaveHandler);
        this.element.addEventListener('drop', this.dropHandler);


        projectState.addListners((projects: Project[]) => {
            const relevantProject = projects.filter((item) => {
                if(this.type === "active"){
                    return item.status === ProjectStatus.Active;
                }
                return item.status === ProjectStatus.Finished;
            })
            this.assignedProjects = relevantProject;
            this.renderProjects();
        })
    }

    renderContent() {
        const listId = `${this.type}-projects-list`;
        this.element.querySelector('ul')!.id = listId;
        this.element.querySelector('h2')!.textContent = this.type.toUpperCase() + " PROJECTS"
    }

    // private attach() {
    //     this.hostElement.insertAdjacentElement('beforeend', this.element);
    // }
}

//ProjectInput class
class ProjectInput extends Component<HTMLDivElement, HTMLFormElement> {
    // templateElement : HTMLTemplateElement;
    // hostElement : HTMLDivElement;
    // element : HTMLFormElement;
    titleElement: HTMLInputElement;
    descriptionElement: HTMLInputElement;
    peopleElement: HTMLInputElement;

    constructor() {
        super('project-input', 'app', true, 'user-input');
        // this.templateElement = document.getElementById('project-input')! as HTMLTemplateElement;
        // this.hostElement = document.getElementById('app')! as HTMLDivElement;

        // const importedNode = document.importNode(this.templateElement.content, true);
        // this.element = importedNode.firstElementChild as HTMLFormElement;
        // this.element.id = 'user-input'

        this.titleElement = this.element.querySelector('#title') as HTMLInputElement;
        this.descriptionElement = this.element.querySelector('#description') as HTMLInputElement;
        this.peopleElement = this.element.querySelector('#people') as HTMLInputElement;
        

        this.configure();
        // this.attach();
    }


    renderContent() {
        
    }

    private gatherUserInput(): [string, string, number] | void {
        const userInput = this.titleElement.value;
        const userDescription = this.descriptionElement.value;
        const userPeople = this.peopleElement.value;

        const inputValitable : Validatable = {
            value: userInput,
            required: true,
        }

        const descValitable : Validatable = {
            value: userDescription,
            required: true,
            minLength: 5
        }

        const peopleValitable : Validatable = {
            value: userPeople,
            required: true,
            min: 1,
            max : 10
        }

        if(!validate(inputValitable) || !validate(descValitable) || !validate(peopleValitable)) {
            alert("invalid input type please try again");
            return;
        } else {
            return [userInput, userDescription, +userPeople];
        }
    }

    private clearInputs() {
        this.titleElement.value = '';
        this.descriptionElement.value = '';
        this.peopleElement.value = '';
    }

    @autobind
    private submitHandler(event: Event) {
        event.preventDefault();
        const userInput = this.gatherUserInput();
        if(Array.isArray(userInput)) {
            const [input, description, people] = userInput;
            projectState.addProject(input, description, people);
            this.clearInputs();
        }

    }

    configure() {
        this.element.addEventListener('submit', this.submitHandler.bind(this))
    }

    // private attach() {
    //     this.hostElement.insertAdjacentElement('afterbegin', this.element);
    // }
}

const prjInpt = new ProjectInput();
const finishedPrjList = new ProjectList('finished');
const ActivePrjList = new ProjectList('active');

