export namespace models {
	
	export class PDFMetadata {
	    path: string;
	    name: string;
	    size: number;
	    lastModified: string;
	    isPDF: boolean;
	    totalPages: number;
	
	    static createFrom(source: any = {}) {
	        return new PDFMetadata(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.path = source["path"];
	        this.name = source["name"];
	        this.size = source["size"];
	        this.lastModified = source["lastModified"];
	        this.isPDF = source["isPDF"];
	        this.totalPages = source["totalPages"];
	    }
	}
	export class PhoneUploadPageCopy {
	    lang: string;
	    dir: string;
	    title: string;
	    heading: string;
	    intro: string;
	    photosLabel: string;
	    chooseFiles: string;
	    upload: string;
	    doneTitle: string;
	    doneBody: string;
	    noFiles: string;
	    retry: string;
	    selectedCountLine: string;
	    tooManyFiles: string;
	    sessionClosedTitle: string;
	    sessionClosedBody: string;
	
	    static createFrom(source: any = {}) {
	        return new PhoneUploadPageCopy(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.lang = source["lang"];
	        this.dir = source["dir"];
	        this.title = source["title"];
	        this.heading = source["heading"];
	        this.intro = source["intro"];
	        this.photosLabel = source["photosLabel"];
	        this.chooseFiles = source["chooseFiles"];
	        this.upload = source["upload"];
	        this.doneTitle = source["doneTitle"];
	        this.doneBody = source["doneBody"];
	        this.noFiles = source["noFiles"];
	        this.retry = source["retry"];
	        this.selectedCountLine = source["selectedCountLine"];
	        this.tooManyFiles = source["tooManyFiles"];
	        this.sessionClosedTitle = source["sessionClosedTitle"];
	        this.sessionClosedBody = source["sessionClosedBody"];
	    }
	}
	export class RotateDefinition {
	    startPage: number;
	    endPage: number;
	    rotation: number;
	
	    static createFrom(source: any = {}) {
	        return new RotateDefinition(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.startPage = source["startPage"];
	        this.endPage = source["endPage"];
	        this.rotation = source["rotation"];
	    }
	}
	export class SplitDefinition {
	    startPage: number;
	    endPage: number;
	    filename: string;
	
	    static createFrom(source: any = {}) {
	        return new SplitDefinition(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.startPage = source["startPage"];
	        this.endPage = source["endPage"];
	        this.filename = source["filename"];
	    }
	}
	export class TextWatermarkConfig {
	    text: string;
	    fontSize: number;
	    fontColor: string;
	    opacity: number;
	    rotation: number;
	    position: string;
	    fontFamily: string;
	
	    static createFrom(source: any = {}) {
	        return new TextWatermarkConfig(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.text = source["text"];
	        this.fontSize = source["fontSize"];
	        this.fontColor = source["fontColor"];
	        this.opacity = source["opacity"];
	        this.rotation = source["rotation"];
	        this.position = source["position"];
	        this.fontFamily = source["fontFamily"];
	    }
	}
	export class WatermarkDefinition {
	    textConfig: TextWatermarkConfig;
	    pageRange: string;
	
	    static createFrom(source: any = {}) {
	        return new WatermarkDefinition(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.textConfig = this.convertValues(source["textConfig"], TextWatermarkConfig);
	        this.pageRange = source["pageRange"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}

}

