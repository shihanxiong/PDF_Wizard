export namespace main {
	
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

}

